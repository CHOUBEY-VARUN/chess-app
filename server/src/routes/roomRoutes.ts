import { Router } from "express";
import { pool } from "../db";
import { verifyToken } from "../middleware/verifyToken";

const router = Router();

type QuickPlayAction = "created" | "joined";

type RoomRow = {
  id: number;
  room_code: string;
  host_user_id: number;
  host_username: string;
  opponent_user_id: number | null;
  opponent_username: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type DatabaseError = Error & {
  code?: string;
};

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const MAX_ROOM_CODE_ATTEMPTS = 5;
const WAITING_ROOM_MATCH_WINDOW_MINUTES = 5;
const RECENT_ACTIVE_ROOM_WINDOW_MINUTES = 2;

function generateRoomCode() {
  let code = "";

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[randomIndex];
  }

  return code;
}

function toRoomResponse(room: RoomRow) {
  return {
    id: room.id,
    roomCode: room.room_code,
    hostUserId: room.host_user_id,
    hostUsername: room.host_username,
    opponentUserId: room.opponent_user_id,
    opponentUsername: room.opponent_username,
    status: room.status,
    createdAt: room.created_at,
    updatedAt: room.updated_at,
  };
}

async function createWaitingRoom(hostUserId: number) {
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    const roomCode = generateRoomCode();

    try {
      const result = await pool.query<RoomRow>(
        `
          WITH created_room AS (
            INSERT INTO rooms (room_code, host_user_id)
            VALUES ($1, $2)
            RETURNING id, room_code, host_user_id, opponent_user_id, status, created_at, updated_at
          )
          SELECT
            created_room.id,
            created_room.room_code,
            created_room.host_user_id,
            host_user.username AS host_username,
            created_room.opponent_user_id,
            opponent_user.username AS opponent_username,
            created_room.status,
            created_room.created_at,
            created_room.updated_at
          FROM created_room
          JOIN users AS host_user ON host_user.id = created_room.host_user_id
          LEFT JOIN users AS opponent_user ON opponent_user.id = created_room.opponent_user_id
        `,
        [roomCode, hostUserId],
      );

      return result.rows[0];
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

async function findExistingWaitingRoom(hostUserId: number) {
  const result = await pool.query<RoomRow>(
    `
      SELECT
        rooms.id,
        rooms.room_code,
        rooms.host_user_id,
        host_user.username AS host_username,
        rooms.opponent_user_id,
        opponent_user.username AS opponent_username,
        rooms.status,
        rooms.created_at,
        rooms.updated_at
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

  return result.rows[0] ?? null;
}

async function findRecentActiveRoom(userId: number) {
  const result = await pool.query<RoomRow>(
    `
      SELECT
        rooms.id,
        rooms.room_code,
        rooms.host_user_id,
        host_user.username AS host_username,
        rooms.opponent_user_id,
        opponent_user.username AS opponent_username,
        rooms.status,
        rooms.created_at,
        rooms.updated_at
      FROM rooms
      JOIN users AS host_user ON host_user.id = rooms.host_user_id
      LEFT JOIN users AS opponent_user ON opponent_user.id = rooms.opponent_user_id
      WHERE rooms.status = 'active'
        AND (rooms.host_user_id = $1 OR rooms.opponent_user_id = $1)
        AND rooms.updated_at >= CURRENT_TIMESTAMP - ($2 * INTERVAL '1 minute')
      ORDER BY rooms.updated_at DESC
      LIMIT 1
    `,
    [userId, RECENT_ACTIVE_ROOM_WINDOW_MINUTES],
  );

  return result.rows[0] ?? null;
}

router.post("/quick-play", verifyToken, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const existingWaitingRoom = await findExistingWaitingRoom(userId);

    if (existingWaitingRoom) {
      res.json({
        action: "created" satisfies QuickPlayAction,
        room: toRoomResponse(existingWaitingRoom),
      });
      return;
    }

    const joinResult = await pool.query<RoomRow>(
      `
        WITH joined_room AS (
          UPDATE rooms
          SET opponent_user_id = $1,
              status = 'active',
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
          RETURNING id, room_code, host_user_id, opponent_user_id, status, created_at, updated_at
        )
        SELECT
          joined_room.id,
          joined_room.room_code,
          joined_room.host_user_id,
          host_user.username AS host_username,
          joined_room.opponent_user_id,
          opponent_user.username AS opponent_username,
          joined_room.status,
          joined_room.created_at,
          joined_room.updated_at
        FROM joined_room
        JOIN users AS host_user ON host_user.id = joined_room.host_user_id
        LEFT JOIN users AS opponent_user ON opponent_user.id = joined_room.opponent_user_id
      `,
      [userId, WAITING_ROOM_MATCH_WINDOW_MINUTES],
    );

    const joinedRoom = joinResult.rows[0];

    if (joinedRoom) {
      res.json({
        action: "joined" satisfies QuickPlayAction,
        room: toRoomResponse(joinedRoom),
      });
      return;
    }

    const recentActiveRoom = await findRecentActiveRoom(userId);

    if (recentActiveRoom) {
      res.json({
        action: "joined" satisfies QuickPlayAction,
        room: toRoomResponse(recentActiveRoom),
      });
      return;
    }

    const createdRoom = await createWaitingRoom(userId);

    if (!createdRoom) {
      res.status(500).json({
        message: "Could not generate a unique room code. Please try again.",
      });
      return;
    }

    res.status(201).json({
      action: "created" satisfies QuickPlayAction,
      room: toRoomResponse(createdRoom),
    });
  } catch (error) {
    console.error("Failed to start quick play", error);
    res.status(500).json({ message: "Failed to start quick play" });
  }
});

router.post("/", verifyToken, async (req, res) => {
  const hostUserId = req.user?.id;

  if (!hostUserId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const room = await createWaitingRoom(hostUserId);

    if (!room) {
      res.status(500).json({
        message: "Could not generate a unique room code. Please try again.",
      });
      return;
    }

    res.status(201).json({
      room: toRoomResponse(room),
    });
  } catch (error) {
    console.error("Failed to create room", error);
    res.status(500).json({ message: "Failed to create room" });
  }
});

router.get("/:roomCode", verifyToken, async (req, res) => {
  const userId = req.user?.id;
  const roomCodeParam = req.params.roomCode;

  if (typeof roomCodeParam !== "string") {
    res.status(400).json({ message: "Invalid room code" });
    return;
  }

  const roomCode = roomCodeParam.trim().toUpperCase();

  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const result = await pool.query<RoomRow>(
      `
        SELECT
          rooms.id,
          rooms.room_code,
          rooms.host_user_id,
          host_user.username AS host_username,
          rooms.opponent_user_id,
          opponent_user.username AS opponent_username,
          rooms.status,
          rooms.created_at,
          rooms.updated_at
        FROM rooms
        JOIN users AS host_user ON host_user.id = rooms.host_user_id
        LEFT JOIN users AS opponent_user ON opponent_user.id = rooms.opponent_user_id
        WHERE rooms.room_code = $1
      `,
      [roomCode],
    );

    const room = result.rows[0];

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.host_user_id !== userId && room.opponent_user_id !== userId) {
      res.status(403).json({ message: "You do not have access to this room" });
      return;
    }

    res.json({ room: toRoomResponse(room) });
  } catch (error) {
    console.error("Failed to load room", error);
    res.status(500).json({ message: "Failed to load room" });
  }
});

export default router;
