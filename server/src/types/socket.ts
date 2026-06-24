import type { Socket } from "socket.io";
import type { PublicUser } from "./auth";

export type PlayerColor = "white" | "black";

export type PromotionPiece = "q" | "r" | "b" | "n";

export type JoinRoomPayload = {
  roomCode: string;
};

export type MakeMovePayload = {
  roomCode: string;
  from: string;
  to: string;
  promotion?: PromotionPiece;
};

export type LastMove = {
  from: string;
  to: string;
  san: string;
  color: PlayerColor;
  promotion?: PromotionPiece;
};

export type OnlineGameState = {
  roomCode: string;
  fen: string;
  turn: PlayerColor;
  statusText: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  isGameOver: boolean;
  lastMove: LastMove | null;
  playerColor: PlayerColor;
};

export type SocketErrorPayload = {
  message: string;
};

export type ClientToServerEvents = {
  joinRoom: (payload: JoinRoomPayload) => void;
  makeMove: (payload: MakeMovePayload) => void;
};

export type ServerToClientEvents = {
  gameState: (state: OnlineGameState) => void;
  moveRejected: (error: SocketErrorPayload) => void;
  roomError: (error: SocketErrorPayload) => void;
};

export type InterServerEvents = Record<string, never>;

export type AuthenticatedSocketData = {
  user: PublicUser;
};

export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AuthenticatedSocketData
>;