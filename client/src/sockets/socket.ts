import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../config/api";

export type PlayerColor = "white" | "black";

export type PromotionPiece = "q" | "r" | "b" | "n";

export type RoomStatus = "waiting" | "active" | "completed" | "cancelled";

export type RoomClosedReason = "game_over" | "new_game" | "cancelled" | null;

export type GameStatus = "active" | "completed" | "abandoned";

export type GameResult = "white_win" | "black_win" | "draw";

export type JoinRoomPayload = {
  roomCode: string;
};

export type MakeMovePayload = {
  roomCode: string;
  from: string;
  to: string;
  promotion?: PromotionPiece;
};

export type RoomActionPayload = {
  roomCode: string;
};

export type LastMove = {
  from: string;
  to: string;
  san: string;
  color: PlayerColor;
  promotion?: PromotionPiece;
};

export type RematchState = {
  requestedByYou: boolean;
  requestedByOpponent: boolean;
  bothRequested: boolean;
};

export type OnlineGameState = {
  roomCode: string;
  roomStatus: RoomStatus;
  roomClosedReason: RoomClosedReason;
  gameSessionId: number;
  gameNumber: number;
  gameStatus: GameStatus;
  fen: string;
  turn: PlayerColor;
  statusText: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  isGameOver: boolean;
  result: GameResult | null;
  winnerUsername: string | null;
  lastMove: LastMove | null;
  playerColor: PlayerColor;
  rematch: RematchState;
  canRequestRematch: boolean;
  canStartNewGame: boolean;
};

export type SocketErrorPayload = {
  message: string;
};

export type RedirectToRoomPayload = {
  roomCode: string;
  reason: "new_game";
};

export type RedirectToLobbyPayload = {
  reason: "opponent_started_new_game" | "room_closed";
  message: string;
};

export type RoomClosedPayload = {
  roomCode: string;
  reason: "new_game" | "game_over";
  message: string;
};

export type ClientToServerEvents = {
  joinRoom: (payload: JoinRoomPayload) => void;
  makeMove: (payload: MakeMovePayload) => void;
  requestRematch: (payload: RoomActionPayload) => void;
  cancelRematch: (payload: RoomActionPayload) => void;
  startNewGame: (payload: RoomActionPayload) => void;
};

export type ServerToClientEvents = {
  gameState: (state: OnlineGameState) => void;
  gameOver: (state: OnlineGameState) => void;
  rematchUpdated: (state: OnlineGameState) => void;
  rematchStarted: (state: OnlineGameState) => void;
  moveRejected: (error: SocketErrorPayload) => void;
  roomError: (error: SocketErrorPayload) => void;
  roomClosed: (payload: RoomClosedPayload) => void;
  redirectToRoom: (payload: RedirectToRoomPayload) => void;
  redirectToLobby: (payload: RedirectToLobbyPayload) => void;
};

export type OnlineChessSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

export function createOnlineChessSocket(token: string): OnlineChessSocket {
  return io(API_BASE_URL, {
    auth: {
      token,
    },
    autoConnect: false,
  });
}
