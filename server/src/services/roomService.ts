import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../db";

export type QuickPlayAction = "created" | "joined";

export type RoomStatus = "waiting" | "active" | "completed" | "cancelled";

export type RoomClosedReason = "game_over" | "new_game" | "cancelled" | null;

type RoomRow = {
  id: number;
  room_code: string;
  host_user_id: number;
  host_username: string;
  opponent_user_id: number | null;
  opponent_username: string | null;
  status: RoomStatus;
  closed_reason: RoomClosedReason;
  closed_by_user_id: number | null;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type DatabaseError = Error & {
  code?: string;
};

export type RoomResponse = {
  id: number;
  roomCode: string;
  hostUserId: number;
  hostUsername: string;
  opponentUserId: number | null;
  opponentUsername: string | null;
  status: RoomStatus;
  closedReason: RoomClosedReason;
  closedByUserId: number | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type QuickPlayResult = {
  action: QuickPlayAction;
  room: RoomResponse;
};

export type NewRoomResult = {
  oldRoom: RoomResponse;
  newRoom: RoomResponse;
  opponentUserId: number;
};

export class RoomServiceError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "RoomServiceError";
    this.statusCode = statusCode;
  }
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const MAX_ROOM_CODE_ATTEMPTS = 5;
const WAITING_ROOM_MATCH_WINDOW_MINUTES = 5;
const RECENT_ACTIVE_ROOM_WINDOW_MINUTES = 2;

function generateRoomCode() {
  let code = "";

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const randomIndex = crypto.randomInt(ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[randomIndex];
  }

  return code;
}

function normalizeRoomCode(roomCode: string) {
  return roomCode.trim().toUpperCase();
}

function roomSelectFields(roomAlias: string) {
  return `
    ${roomAlias}.id,
    ${roomAlias}.room_code,
    ${roomAlias}.host_user_id,
    host_user.username AS host_username,
    ${roomAlias}.opponent_user_id,
    opponent_user.username AS opponent_username,
    ${roomAlias}.status,
    ${roomAlias}.closed_reason,
    ${roomAlias}.closed_by_user_id,
    ${roomAlias}.closed_at,
    ${roomAlias}.created_at,
    ${roomAlias}.updated_at
  `;
}

function toRoomResponse(room: RoomRow): RoomResponse {
  return {
    id: room.id,
    roomCode: room.room_code,
    hostUserId: room.host_user_id,
    hostUsername: room.host_username,
    opponentUserId: room.opponent_user_id,
    opponentUsername: room.opponent_username,
    status: room.status,
    closedReason: room.closed_reason,
    closedByUserId: room.closed_by_user_id,
    closedAt: room.closed_at,
    createdAt: room.created_at,
    updatedAt: room.updated_at,
  };
}

async function createWaitingRoomWithExecutor(
  executor: Pick<PoolClient, "query">,
  hostUserId: number,
) {
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    const roomCode = generateRoomCode();

    try {
      const result = await executor.query<RoomRow>(
        `
          WITH created_room AS (
            INSERT INTO rooms (room_code, host_user_id)
            VALUES ($1, $2)
            RETURNING id, room_code, host_user_id, opponent_user_id, status,
              closed_reason, closed_by_user_id, closed_at, created_at, updated_at
          )
          SELECT ${roomSelectFields("created_room")}
          FROM created_room
          JOIN users AS host_user ON host_user.id = created_room.host_user_id
          LEFT JOIN users AS opponent_user ON opponent_user.id = created_room.opponent_user_id
        `,
        [roomCode, hostUserId],
      );

      const room = result.rows[0];

      if (room) {
        return toRoomResponse(room);
      }
    } catch (error) {
      const databaseError = error as DatabaseError;

      if (databaseError.code === "23505") {
        continue;
      }

      throw error;
    }
  }

  return null;
}

async function createWaitingRoom(hostUserId: number) {
  return createWaitingRoomWithExecutor(pool, hostUserId);
}

async function findExistingWaitingRoom(hostUserId: number) {
  const result = await pool.query<RoomRow>(
    `
      SELECT ${roomSelectFields("rooms")}
      FROM rooms
      JOIN users AS host_user ON host_user.id = rooms.host_user_id
      LEFT JOIN users AS opponent_user ON opponent_user.id = rooms.opponent_user_id
      WHERE rooms.host_user_id = $1
        AND rooms.status = 'waiting'
        AND rooms.opponent_user_id IS NULL
        AND rooms.created_at >= CURRENT_TIMESTAMP - ($2 * INTERVAL '1 minute')
      ORDER BY rooms.created_at DESC
      LIMIT 1
    `,
    [hostUserId, WAITING_ROOM_MATCH_WINDOW_MINUTES],
  );

  const room = result.rows[0];
  return room ? toRoomResponse(room) : null;
}

async function findRecentActiveRoom(userId: number) {
  const result = await pool.query<RoomRow>(
    `
      SELECT ${roomSelectFields("rooms")}
      FROM rooms
      JOIN users AS host_user ON host_user.id = rooms.host_user_id
      LEFT JOIN users AS opponent_user ON opponent_user.id = rooms.opponent_user_id
      WHERE rooms.status = 'active'
        AND rooms.closed_reason IS NULL
        AND (rooms.host_user_id = $1 OR rooms.opponent_user_id = $1)
        AND rooms.updated_at >= CURRENT_TIMESTAMP - ($2 * INTERVAL '1 minute')
      ORDER BY rooms.updated_at DESC
      LIMIT 1
    `,
    [userId, RECENT_ACTIVE_ROOM_WINDOW_MINUTES],
  );

  const room = result.rows[0];
  return room ? toRoomResponse(room) : null;
}

export async function createRoomForHost(hostUserId: number) {
  const room = await createWaitingRoom(hostUserId);

  if (!room) {
    throw new RoomServiceError(
      500,
      "Could not generate a unique room code. Please try again.",
    );
  }

  return room;
}

export async function startQuickPlay(userId: number): Promise<QuickPlayResult> {
  const existingWaitingRoom = await findExistingWaitingRoom(userId);

  if (existingWaitingRoom) {
    return {
      action: "created",
      room: existingWaitingRoom,
    };
  }

  const joinResult = await pool.query<RoomRow>(
    `
      WITH joined_room AS (
        UPDATE rooms
        SET opponent_user_id = $1,
            status = 'active',
            closed_reason = NULL,
            closed_by_user_id = NULL,
            closed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (
          SELECT id
          FROM rooms
          WHERE status = 'waiting'
            AND opponent_user_id IS NULL
            AND host_user_id <> $1
            AND created_at >= CURRENT_TIMESTAMP - ($2 * INTERVAL '1 minute')
          ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING id, room_code, host_user_id, opponent_user_id, status,
          closed_reason, closed_by_user_id, closed_at, created_at, updated_at
      )
      SELECT ${roomSelectFields("joined_room")}
      FROM joined_room
      JOIN users AS host_user ON host_user.id = joined_room.host_user_id
      LEFT JOIN users AS opponent_user ON opponent_user.id = joined_room.opponent_user_id
    `,
    [userId, WAITING_ROOM_MATCH_WINDOW_MINUTES],
  );

  const joinedRoom = joinResult.rows[0];

  if (joinedRoom) {
    return {
      action: "joined",
      room: toRoomResponse(joinedRoom),
    };
  }

  const recentActiveRoom = await findRecentActiveRoom(userId);

  if (recentActiveRoom) {
    return {
      action: "joined",
      room: recentActiveRoom,
    };
  }

  return {
    action: "created",
    room: await createRoomForHost(userId),
  };
}

async function rollbackTransaction(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original error from the transaction block.
  }
}

export async function joinRoomByCode(roomCodeInput: string, userId: number) {
  const roomCode = normalizeRoomCode(roomCodeInput);

  if (!roomCode) {
    throw new RoomServiceError(400, "Room code is required");
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const roomResult = await client.query<RoomRow>(
      `
        SELECT ${roomSelectFields("rooms")}
        FROM rooms
        JOIN users AS host_user ON host_user.id = rooms.host_user_id
        LEFT JOIN users AS opponent_user ON opponent_user.id = rooms.opponent_user_id
        WHERE rooms.room_code = $1
        FOR UPDATE OF rooms
      `,
      [roomCode],
    );

    const room = roomResult.rows[0];

    if (!room) {
      throw new RoomServiceError(404, "Room not found");
    }

    if (room.host_user_id === userId) {
      throw new RoomServiceError(409, "You cannot join your own room");
    }

    if (room.status !== "waiting") {
      throw new RoomServiceError(409, "This room is not waiting for a player");
    }

    if (room.opponent_user_id) {
      throw new RoomServiceError(409, "This room already has an opponent");
    }

    const joinedResult = await client.query<RoomRow>(
      `
        WITH joined_room AS (
          UPDATE rooms
          SET opponent_user_id = $1,
              status = 'active',
              closed_reason = NULL,
              closed_by_user_id = NULL,
              closed_at = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, room_code, host_user_id, opponent_user_id, status,
            closed_reason, closed_by_user_id, closed_at, created_at, updated_at
        )
        SELECT ${roomSelectFields("joined_room")}
        FROM joined_room
        JOIN users AS host_user ON host_user.id = joined_room.host_user_id
        LEFT JOIN users AS opponent_user ON opponent_user.id = joined_room.opponent_user_id
      `,
      [userId, room.id],
    );

    const joinedRoom = joinedResult.rows[0];

    if (!joinedRoom) {
      throw new RoomServiceError(500, "Failed to join room");
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return toRoomResponse(joinedRoom);
  } catch (error) {
    if (transactionStarted) {
      await rollbackTransaction(client);
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function getRoomByCodeForUser(
  roomCodeInput: string,
  userId: number,
) {
  const roomCode = normalizeRoomCode(roomCodeInput);

  if (!roomCode) {
    throw new RoomServiceError(400, "Room code is required");
  }

  const result = await pool.query<RoomRow>(
    `
      SELECT ${roomSelectFields("rooms")}
      FROM rooms
      JOIN users AS host_user ON host_user.id = rooms.host_user_id
      LEFT JOIN users AS opponent_user ON opponent_user.id = rooms.opponent_user_id
      WHERE rooms.room_code = $1
    `,
    [roomCode],
  );

  const room = result.rows[0];

  if (!room) {
    throw new RoomServiceError(404, "Room not found");
  }

  if (room.host_user_id !== userId && room.opponent_user_id !== userId) {
    throw new RoomServiceError(403, "You do not have access to this room");
  }

  return toRoomResponse(room);
}

export async function closeRoomAsGameOver(roomId: number) {
  await pool.query(
    `
      UPDATE rooms
      SET status = 'completed',
          closed_reason = 'game_over',
          closed_by_user_id = NULL,
          closed_at = COALESCE(closed_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND closed_reason IS NULL
    `,
    [roomId],
  );
}

export async function closeRoomAndCreateNewRoom(
  roomCodeInput: string,
  userId: number,
): Promise<NewRoomResult> {
  const roomCode = normalizeRoomCode(roomCodeInput);

  if (!roomCode) {
    throw new RoomServiceError(400, "Room code is required");
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const roomResult = await client.query<RoomRow>(
      `
        SELECT ${roomSelectFields("rooms")}
        FROM rooms
        JOIN users AS host_user ON host_user.id = rooms.host_user_id
        LEFT JOIN users AS opponent_user ON opponent_user.id = rooms.opponent_user_id
        WHERE rooms.room_code = $1
        FOR UPDATE OF rooms
      `,
      [roomCode],
    );

    const room = roomResult.rows[0];

    if (!room) {
      throw new RoomServiceError(404, "Room not found");
    }

    if (room.host_user_id !== userId && room.opponent_user_id !== userId) {
      throw new RoomServiceError(403, "You do not have access to this room");
    }

    if (!room.opponent_user_id) {
      throw new RoomServiceError(409, "This room does not have an opponent");
    }

    if (room.closed_reason === "new_game") {
      throw new RoomServiceError(409, "This room is already closed");
    }

    const closedResult = await client.query<RoomRow>(
      `
        WITH closed_room AS (
          UPDATE rooms
          SET status = 'completed',
              closed_reason = 'new_game',
              closed_by_user_id = $1,
              closed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, room_code, host_user_id, opponent_user_id, status,
            closed_reason, closed_by_user_id, closed_at, created_at, updated_at
        )
        SELECT ${roomSelectFields("closed_room")}
        FROM closed_room
        JOIN users AS host_user ON host_user.id = closed_room.host_user_id
        LEFT JOIN users AS opponent_user ON opponent_user.id = closed_room.opponent_user_id
      `,
      [userId, room.id],
    );

    await client.query(
      `
        UPDATE game_sessions
        SET ended_reason = COALESCE(ended_reason, 'new_game'),
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = $1
          AND status = 'completed'
      `,
      [room.id],
    );

    const newRoom = await createWaitingRoomWithExecutor(client, userId);

    if (!newRoom) {
      throw new RoomServiceError(
        500,
        "Could not generate a unique room code. Please try again.",
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return {
      oldRoom: toRoomResponse(closedResult.rows[0]),
      newRoom,
      opponentUserId:
        room.host_user_id === userId ? room.opponent_user_id : room.host_user_id,
    };
  } catch (error) {
    if (transactionStarted) {
      await rollbackTransaction(client);
    }

    throw error;
  } finally {
    client.release();
  }
}
