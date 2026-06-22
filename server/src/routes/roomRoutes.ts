import { Router } from "express";
import { pool } from "../db";
import { verifyToken } from "../middleware/verifyToken";

const router = Router();

type RoomRow = {
  id: number;
  room_code: string;
  host_user_id: number;
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
    status: room.status,
    createdAt: room.created_at,
    updatedAt: room.updated_at,
  };
}

router.post("/", verifyToken, async (req, res) => {
  const hostUserId = req.user?.id;

  if (!hostUserId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    const roomCode = generateRoomCode();

    try {
      const result = await pool.query<RoomRow>(
        `
          INSERT INTO rooms (room_code, host_user_id)
          VALUES ($1, $2)
          RETURNING id, room_code, host_user_id, status, created_at, updated_at
        `,
        [roomCode, hostUserId],
      );

      res.status(201).json({
        room: toRoomResponse(result.rows[0]),
      });
      return;
    } catch (error) {
      const databaseError = error as DatabaseError;

      if (databaseError.code === "23505") {
        continue;
      }

      console.error("Failed to create room", error);
      res.status(500).json({ message: "Failed to create room" });
      return;
    }
  }

  res.status(500).json({
    message: "Could not generate a unique room code. Please try again.",
  });
});

export default router;