import {
  Chess,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
} from "chess.js";
import { getRoomByCodeForUser, type RoomResponse } from "./roomService";
import type {
  LastMove,
  MakeMovePayload,
  OnlineGameState,
  PlayerColor,
  PromotionPiece,
} from "../types/socket";

type GameSession = {
  game: Chess;
  lastMove: LastMove | null;
};

const activeGames = new Map<string, GameSession>();

const TURN_LABELS: Record<PlayerColor, string> = {
  white: "White",
  black: "Black",
};

const PLAYER_COLOR_TO_CHESS_TURN: Record<PlayerColor, Color> = {
  white: "w",
  black: "b",
};

const CHESS_TURN_TO_PLAYER_COLOR: Record<Color, PlayerColor> = {
  w: "white",
  b: "black",
};

const PROMOTION_PIECES: readonly PromotionPiece[] = ["q", "r", "b", "n"];

export class OnlineGameServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnlineGameServiceError";
  }
}

function normalizeRoomCode(roomCode: string) {
  return roomCode.trim().toUpperCase();
}

function isSquare(value: string): value is Square {
  return /^[a-h][1-8]$/.test(value);
}

function isPromotionPiece(value: string): value is PromotionPiece {
  return PROMOTION_PIECES.includes(value as PromotionPiece);
}

function toPromotionPiece(
  piece: PieceSymbol | undefined,
): PromotionPiece | undefined {
  if (!piece || !isPromotionPiece(piece)) {
    return undefined;
  }

  return piece;
}

function getOrCreateGameSession(roomCode: string) {
  const existingSession = activeGames.get(roomCode);

  if (existingSession) {
    return existingSession;
  }

  const session: GameSession = {
    game: new Chess(),
    lastMove: null,
  };

  activeGames.set(roomCode, session);
  return session;
}

function getPlayerColor(room: RoomResponse, userId: number): PlayerColor {
  if (room.hostUserId === userId) {
    return "white";
  }

  if (room.opponentUserId === userId) {
    return "black";
  }

  throw new OnlineGameServiceError("You are not part of this room.");
}

async function getActiveRoomForUser(roomCodeInput: string, userId: number) {
  const roomCode = normalizeRoomCode(roomCodeInput);

  if (!roomCode) {
    throw new OnlineGameServiceError("Room code is required.");
  }

  const room = await getRoomByCodeForUser(roomCode, userId);

  if (room.status !== "active") {
    throw new OnlineGameServiceError("This room is not active yet.");
  }

  if (room.opponentUserId === null) {
    throw new OnlineGameServiceError(
      "This room does not have an opponent yet.",
    );
  }

  return room;
}

function getWinner(game: Chess) {
  const losingColor = CHESS_TURN_TO_PLAYER_COLOR[game.turn()];
  return losingColor === "white" ? "Black" : "White";
}

function getStatusText(game: Chess) {
  const turnColor = CHESS_TURN_TO_PLAYER_COLOR[game.turn()];
  const currentTurn = TURN_LABELS[turnColor];

  if (game.isCheckmate()) {
    return `Checkmate. ${getWinner(game)} wins.`;
  }

  if (game.isStalemate()) {
    return "Stalemate. The game is drawn.";
  }

  if (game.isDraw()) {
    return "Draw. The game is over.";
  }

  if (game.isCheck()) {
    return `${currentTurn} is in check.`;
  }

  return `${currentTurn} to move.`;
}

function toLastMove(move: Move): LastMove {
  return {
    from: move.from,
    to: move.to,
    san: move.san,
    color: CHESS_TURN_TO_PLAYER_COLOR[move.color],
    promotion: toPromotionPiece(move.promotion),
  };
}

function buildGameState(
  roomCode: string,
  session: GameSession,
  playerColor: PlayerColor,
): OnlineGameState {
  const { game } = session;

  return {
    roomCode,
    fen: game.fen(),
    turn: CHESS_TURN_TO_PLAYER_COLOR[game.turn()],
    statusText: getStatusText(game),
    isCheck: game.isCheck(),
    isCheckmate: game.isCheckmate(),
    isDraw: game.isDraw(),
    isStalemate: game.isStalemate(),
    isGameOver: game.isGameOver(),
    lastMove: session.lastMove,
    playerColor,
  };
}

export async function joinOnlineGame(roomCodeInput: string, userId: number) {
  const room = await getActiveRoomForUser(roomCodeInput, userId);
  const playerColor = getPlayerColor(room, userId);
  const session = getOrCreateGameSession(room.roomCode);

  return buildGameState(room.roomCode, session, playerColor);
}

export async function getOnlineGameState(
  roomCodeInput: string,
  userId: number,
) {
  const room = await getActiveRoomForUser(roomCodeInput, userId);
  const playerColor = getPlayerColor(room, userId);
  const session = getOrCreateGameSession(room.roomCode);

  return buildGameState(room.roomCode, session, playerColor);
}

export async function makeOnlineMove(payload: MakeMovePayload, userId: number) {
  const room = await getActiveRoomForUser(payload.roomCode, userId);
  const playerColor = getPlayerColor(room, userId);
  const expectedTurn = PLAYER_COLOR_TO_CHESS_TURN[playerColor];
  const session = getOrCreateGameSession(room.roomCode);

  if (session.game.isGameOver()) {
    throw new OnlineGameServiceError("This game is already over.");
  }

  if (session.game.turn() !== expectedTurn) {
    throw new OnlineGameServiceError("It is not your turn.");
  }

  if (!isSquare(payload.from) || !isSquare(payload.to)) {
    throw new OnlineGameServiceError("Invalid move squares.");
  }

  const piece = session.game.get(payload.from);

  if (!piece) {
    throw new OnlineGameServiceError("No piece exists on that square.");
  }

  if (piece.color !== expectedTurn) {
    throw new OnlineGameServiceError("You can only move your own pieces.");
  }

  try {
    const move = session.game.move({
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion ?? "q",
    });

    session.lastMove = toLastMove(move);

    return room.roomCode;
  } catch {
    throw new OnlineGameServiceError("Illegal move.");
  }
}
