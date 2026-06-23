import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken";
import {
  createRoomForHost,
  getRoomByCodeForUser,
  joinRoomByCode,
  RoomServiceError,
  startQuickPlay,
} from "../services/roomService";

const router = Router();

function sendServiceError(
  error: unknown,
  fallbackMessage: string,
  logMessage: string,
) {
  if (error instanceof RoomServiceError) {
    return {
      statusCode: error.statusCode,
      body: { message: error.message },
    };
  }

  console.error(logMessage, error);

  return {
    statusCode: 500,
    body: { message: fallbackMessage },
  };
}

router.post("/quick-play", verifyToken, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const result = await startQuickPlay(userId);
    res.status(result.action === "created" ? 201 : 200).json(result);
  } catch (error) {
    const response = sendServiceError(
      error,
      "Failed to start quick play",
      "Failed to start quick play",
    );

    res.status(response.statusCode).json(response.body);
  }
});

router.post("/:roomCode/join", verifyToken, async (req, res) => {
  const userId = req.user?.id;
  const roomCode = req.params.roomCode;

  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (typeof roomCode !== "string") {
    res.status(400).json({ message: "Invalid room code" });
    return;
  }

  try {
    const room = await joinRoomByCode(roomCode, userId);
    res.json({ room });
  } catch (error) {
    const response = sendServiceError(
      error,
      "Failed to join room",
      "Failed to join room",
    );

    res.status(response.statusCode).json(response.body);
  }
});

router.post("/", verifyToken, async (req, res) => {
  const hostUserId = req.user?.id;

  if (!hostUserId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const room = await createRoomForHost(hostUserId);
    res.status(201).json({ room });
  } catch (error) {
    const response = sendServiceError(
      error,
      "Failed to create room",
      "Failed to create room",
    );

    res.status(response.statusCode).json(response.body);
  }
});

router.get("/:roomCode", verifyToken, async (req, res) => {
  const userId = req.user?.id;
  const roomCode = req.params.roomCode;

  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (typeof roomCode !== "string") {
    res.status(400).json({ message: "Invalid room code" });
    return;
  }

  try {
    const room = await getRoomByCodeForUser(roomCode, userId);
    res.json({ room });
  } catch (error) {
    const response = sendServiceError(
      error,
      "Failed to load room",
      "Failed to load room",
    );

    res.status(response.statusCode).json(response.body);
  }
});

export default router;
