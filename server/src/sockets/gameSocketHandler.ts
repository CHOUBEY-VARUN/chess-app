import type { Server } from "socket.io";
import {
  cancelRematch,
  getOnlineGameState,
  joinOnlineGame,
  makeOnlineMove,
  OnlineGameServiceError,
  requestRematch,
  startNewGameFromRoom,
} from "../services/onlineGameService";
import { RoomServiceError } from "../services/roomService";
import type {
  AuthenticatedSocket,
  AuthenticatedSocketData,
  ClientToServerEvents,
  InterServerEvents,
  JoinRoomPayload,
  MakeMovePayload,
  PromotionPiece,
  RoomActionPayload,
  ServerToClientEvents,
} from "../types/socket";

type OnlineChessServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AuthenticatedSocketData
>;

const PROMOTION_PIECES: readonly PromotionPiece[] = ["q", "r", "b", "n"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPromotionPiece(value: string): value is PromotionPiece {
  return PROMOTION_PIECES.includes(value as PromotionPiece);
}

function parseJoinRoomPayload(payload: unknown): JoinRoomPayload {
  if (!isRecord(payload) || typeof payload.roomCode !== "string") {
    throw new OnlineGameServiceError("Room code is required.");
  }

  return {
    roomCode: payload.roomCode,
  };
}

function parseRoomActionPayload(payload: unknown): RoomActionPayload {
  if (!isRecord(payload) || typeof payload.roomCode !== "string") {
    throw new OnlineGameServiceError("Room code is required.");
  }

  return {
    roomCode: payload.roomCode,
  };
}

function parseMakeMovePayload(payload: unknown): MakeMovePayload {
  if (
    !isRecord(payload) ||
    typeof payload.roomCode !== "string" ||
    typeof payload.from !== "string" ||
    typeof payload.to !== "string"
  ) {
    throw new OnlineGameServiceError("Move payload is invalid.");
  }

  if (payload.promotion === undefined) {
    return {
      roomCode: payload.roomCode,
      from: payload.from,
      to: payload.to,
    };
  }

  if (typeof payload.promotion !== "string") {
    throw new OnlineGameServiceError("Promotion piece is invalid.");
  }

  const promotion = payload.promotion.toLowerCase();

  if (!isPromotionPiece(promotion)) {
    throw new OnlineGameServiceError("Promotion piece is invalid.");
  }

  return {
    roomCode: payload.roomCode,
    from: payload.from,
    to: payload.to,
    promotion,
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (
    error instanceof OnlineGameServiceError ||
    error instanceof RoomServiceError
  ) {
    return error.message;
  }

  console.error(fallbackMessage, error);
  return fallbackMessage;
}

async function emitGameStateToRoom(io: OnlineChessServer, roomCode: string) {
  const sockets = await io.in(roomCode).fetchSockets();

  await Promise.all(
    sockets.map(async (playerSocket) => {
      try {
        const state = await getOnlineGameState(
          roomCode,
          playerSocket.data.user.id,
        );

        playerSocket.emit("gameState", state);

        if (state.isGameOver) {
          playerSocket.emit("gameOver", state);
        }
      } catch (error) {
        playerSocket.emit("roomError", {
          message: getErrorMessage(error, "Failed to sync game state."),
        });
      }
    }),
  );
}

async function emitRematchUpdated(io: OnlineChessServer, roomCode: string) {
  const sockets = await io.in(roomCode).fetchSockets();

  await Promise.all(
    sockets.map(async (playerSocket) => {
      try {
        const state = await getOnlineGameState(
          roomCode,
          playerSocket.data.user.id,
        );

        playerSocket.emit("rematchUpdated", state);
      } catch (error) {
        playerSocket.emit("roomError", {
          message: getErrorMessage(error, "Failed to sync rematch state."),
        });
      }
    }),
  );
}

async function emitRematchStarted(io: OnlineChessServer, roomCode: string) {
  const sockets = await io.in(roomCode).fetchSockets();

  await Promise.all(
    sockets.map(async (playerSocket) => {
      try {
        const state = await getOnlineGameState(
          roomCode,
          playerSocket.data.user.id,
        );

        playerSocket.emit("rematchStarted", state);
        playerSocket.emit("gameState", state);
      } catch (error) {
        playerSocket.emit("roomError", {
          message: getErrorMessage(error, "Failed to start rematch."),
        });
      }
    }),
  );
}

export function registerGameSocketHandlers(
  io: OnlineChessServer,
  socket: AuthenticatedSocket,
) {
  socket.on("joinRoom", async (payload: unknown) => {
    try {
      const { roomCode } = parseJoinRoomPayload(payload);
      const state = await joinOnlineGame(roomCode, socket.data.user.id);

      await socket.join(state.roomCode);
      socket.emit("gameState", state);

      if (state.isGameOver) {
        socket.emit("gameOver", state);
      }
    } catch (error) {
      socket.emit("roomError", {
        message: getErrorMessage(error, "Failed to join room."),
      });
    }
  });

  socket.on("makeMove", async (payload: unknown) => {
    try {
      const movePayload = parseMakeMovePayload(payload);
      const roomCode = await makeOnlineMove(movePayload, socket.data.user.id);

      await emitGameStateToRoom(io, roomCode);
    } catch (error) {
      socket.emit("moveRejected", {
        message: getErrorMessage(error, "Move rejected."),
      });
    }
  });

  socket.on("requestRematch", async (payload: unknown) => {
    try {
      const { roomCode } = parseRoomActionPayload(payload);
      const result = await requestRematch(roomCode, socket.data.user.id);

      if (result.started) {
        await emitRematchStarted(io, result.roomCode);
      } else {
        await emitRematchUpdated(io, result.roomCode);
      }
    } catch (error) {
      socket.emit("roomError", {
        message: getErrorMessage(error, "Failed to request rematch."),
      });
    }
  });

  socket.on("cancelRematch", async (payload: unknown) => {
    try {
      const { roomCode } = parseRoomActionPayload(payload);
      const updatedRoomCode = await cancelRematch(
        roomCode,
        socket.data.user.id,
      );

      await emitRematchUpdated(io, updatedRoomCode);
    } catch (error) {
      socket.emit("roomError", {
        message: getErrorMessage(error, "Failed to cancel rematch."),
      });
    }
  });

  socket.on("startNewGame", async (payload: unknown) => {
    try {
      const { roomCode } = parseRoomActionPayload(payload);
      const result = await startNewGameFromRoom(
        roomCode,
        socket.data.user.id,
      );
      const sockets = await io.in(result.oldRoomCode).fetchSockets();

      await Promise.all(
        sockets.map(async (playerSocket) => {
          playerSocket.emit("roomClosed", {
            roomCode: result.oldRoomCode,
            reason: "new_game",
            message:
              "This room was closed because a player started a new game.",
          });

          if (playerSocket.data.user.id === result.requesterUserId) {
            playerSocket.emit("redirectToRoom", {
              roomCode: result.newRoomCode,
              reason: "new_game",
            });
          } else if (playerSocket.data.user.id === result.opponentUserId) {
            playerSocket.emit("redirectToLobby", {
              reason: "opponent_started_new_game",
              message:
                "Your opponent started a new game. You can join or start another room.",
            });
          }

          await playerSocket.leave(result.oldRoomCode);
        }),
      );
    } catch (error) {
      socket.emit("roomError", {
        message: getErrorMessage(error, "Failed to start a new game."),
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(
      `Socket disconnected: ${socket.id} user=${socket.data.user.id} reason=${reason}`,
    );
  });
}
