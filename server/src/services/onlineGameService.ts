import {
  Chess,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
} from "chess.js";
import { pool } from "../db";
import type {
  GameResult,
  GameStatus,
  LastMove,
  MakeMovePayload,
  OnlineGameState,
  PlayerColor,
  PromotionPiece,
} from "../types/socket";
import {
  closeRoomAndCreateNewRoom,
  closeRoomAsGameOver,
  getRoomByCodeForUser,
  type RoomResponse,
} from "./roomService";

type GameEndedReason =
  | "checkmate"
  | "stalemate"
  | "insufficient_material"
  | "threefold_repetition"
  | "fifty_move_rule"
  | "draw"
  | "new_game"
  | "abandoned";

type GameSessionRow = {
  id: number;
  room_id: number;
  game_number: number;
  white_user_id: number;
  white_username: string;
  black_user_id: number;
  black_username: string;
  status: GameStatus;
  fen: string;
  last_move: LastMove | null;
  result: GameResult | null;
  winner_user_id: number | null;
  winner_username: string | null;
  ended_reason: GameEndedReason | null;
  white_rematch_requested_at: Date | null;
  black_rematch_requested_at: Date | null;
  created_at: Date;
  updated_at: Date;
  ended_at: Date | null;
};

type CachedGame = {
  game: Chess;
  fen: string;
};

export type RematchResult = {
  roomCode: string;
  started: boolean;
};

export type StartNewGameResult = {
  oldRoomCode: string;
  newRoomCode: string;
  requesterUserId: number;
  opponentUserId: number;
};

const activeGames = new Map<number, CachedGame>();
const STARTING_FEN = new Chess().fen();

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

function gameSessionSelectFields(sessionAlias: string) {
  return `
    ${sessionAlias}.id,
    ${sessionAlias}.room_id,
    ${sessionAlias}.game_number,
    ${sessionAlias}.white_user_id,
    white_user.username AS white_username,
    ${sessionAlias}.black_user_id,
    black_user.username AS black_username,
    ${sessionAlias}.status,
    ${sessionAlias}.fen,
    ${sessionAlias}.last_move,
    ${sessionAlias}.result,
    ${sessionAlias}.winner_user_id,
    winner_user.username AS winner_username,
    ${sessionAlias}.ended_reason,
    ${sessionAlias}.white_rematch_requested_at,
    ${sessionAlias}.black_rematch_requested_at,
    ${sessionAlias}.created_at,
    ${sessionAlias}.updated_at,
    ${sessionAlias}.ended_at
  `;
}

async function getLatestGameSession(roomId: number) {
  const result = await pool.query<GameSessionRow>(
    `
      SELECT ${gameSessionSelectFields("game_sessions")}
      FROM game_sessions
      JOIN users AS white_user ON white_user.id = game_sessions.white_user_id
      JOIN users AS black_user ON black_user.id = game_sessions.black_user_id
      LEFT JOIN users AS winner_user ON winner_user.id = game_sessions.winner_user_id
      WHERE game_sessions.room_id = $1
      ORDER BY game_sessions.game_number DESC
      LIMIT 1
    `,
    [roomId],
  );

  return result.rows[0] ?? null;
}

async function getActiveGameSession(roomId: number) {
  const result = await pool.query<GameSessionRow>(
    `
      SELECT ${gameSessionSelectFields("game_sessions")}
      FROM game_sessions
      JOIN users AS white_user ON white_user.id = game_sessions.white_user_id
      JOIN users AS black_user ON black_user.id = game_sessions.black_user_id
      LEFT JOIN users AS winner_user ON winner_user.id = game_sessions.winner_user_id
      WHERE game_sessions.room_id = $1
        AND game_sessions.status = 'active'
      ORDER BY game_sessions.game_number DESC
      LIMIT 1
    `,
    [roomId],
  );

  return result.rows[0] ?? null;
}

async function createGameSession(
  room: RoomResponse,
  whiteUserId: number,
  blackUserId: number,
  gameNumber: number,
) {
  const result = await pool.query<GameSessionRow>(
    `
      WITH created_session AS (
        INSERT INTO game_sessions (
          room_id,
          game_number,
          white_user_id,
          black_user_id,
          status,
          fen
        )
        VALUES ($1, $2, $3, $4, 'active', $5)
        RETURNING *
      )
      SELECT ${gameSessionSelectFields("created_session")}
      FROM created_session
      JOIN users AS white_user ON white_user.id = created_session.white_user_id
      JOIN users AS black_user ON black_user.id = created_session.black_user_id
      LEFT JOIN users AS winner_user ON winner_user.id = created_session.winner_user_id
    `,
    [room.id, gameNumber, whiteUserId, blackUserId, STARTING_FEN],
  );

  const session = result.rows[0];
  activeGames.set(session.id, {
    game: new Chess(session.fen),
    fen: session.fen,
  });

  return session;
}

async function getOrCreateActiveGameSession(room: RoomResponse) {
  const existingSession = await getActiveGameSession(room.id);

  if (existingSession) {
    return existingSession;
  }

  if (room.status !== "active" || room.closedReason !== null) {
    throw new OnlineGameServiceError("This room is not active.");
  }

  if (room.opponentUserId === null) {
    throw new OnlineGameServiceError("This room does not have an opponent yet.");
  }

  const latestSession = await getLatestGameSession(room.id);
  const gameNumber = latestSession ? latestSession.game_number + 1 : 1;

  return createGameSession(
    room,
    room.hostUserId,
    room.opponentUserId,
    gameNumber,
  );
}

function getGame(session: GameSessionRow) {
  const cachedGame = activeGames.get(session.id);

  if (cachedGame && cachedGame.fen === session.fen) {
    return cachedGame.game;
  }

  const game = new Chess(session.fen);

  activeGames.set(session.id, {
    game,
    fen: session.fen,
  });

  return game;
}

function getPlayerColor(session: GameSessionRow, userId: number): PlayerColor {
  if (session.white_user_id === userId) {
    return "white";
  }

  if (session.black_user_id === userId) {
    return "black";
  }

  throw new OnlineGameServiceError("You are not part of this game.");
}

function getWinnerLabel(game: Chess) {
  const losingColor = CHESS_TURN_TO_PLAYER_COLOR[game.turn()];
  return losingColor === "white" ? "Black" : "White";
}

function getStatusText(game: Chess, session: GameSessionRow) {
  const turnColor = CHESS_TURN_TO_PLAYER_COLOR[game.turn()];
  const currentTurn = TURN_LABELS[turnColor];

  if (session.status === "completed") {
    if (session.result === "white_win") {
      return "Game over. White wins.";
    }

    if (session.result === "black_win") {
      return "Game over. Black wins.";
    }

    return "Game over. The game is drawn.";
  }

  if (game.isCheckmate()) {
    return `Checkmate. ${getWinnerLabel(game)} wins.`;
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

function getEndedReason(game: Chess): GameEndedReason | null {
  if (game.isCheckmate()) {
    return "checkmate";
  }

  if (game.isStalemate()) {
    return "stalemate";
  }

  if (game.isInsufficientMaterial()) {
    return "insufficient_material";
  }

  if (game.isThreefoldRepetition()) {
    return "threefold_repetition";
  }

  if (game.isDrawByFiftyMoves()) {
    return "fifty_move_rule";
  }

  if (game.isDraw()) {
    return "draw";
  }

  return null;
}

function getGameResult(game: Chess): GameResult | null {
  if (game.isCheckmate()) {
    const losingColor = CHESS_TURN_TO_PLAYER_COLOR[game.turn()];
    return losingColor === "white" ? "black_win" : "white_win";
  }

  if (game.isDraw()) {
    return "draw";
  }

  return null;
}

function getWinnerUserId(session: GameSessionRow, result: GameResult | null) {
  if (result === "white_win") {
    return session.white_user_id;
  }

  if (result === "black_win") {
    return session.black_user_id;
  }

  return null;
}

function buildGameState(
  room: RoomResponse,
  session: GameSessionRow,
  game: Chess,
  userId: number,
): OnlineGameState {
  const playerColor = getPlayerColor(session, userId);
  const requestedByYou =
    playerColor === "white"
      ? Boolean(session.white_rematch_requested_at)
      : Boolean(session.black_rematch_requested_at);
  const requestedByOpponent =
    playerColor === "white"
      ? Boolean(session.black_rematch_requested_at)
      : Boolean(session.white_rematch_requested_at);
  const bothRequested =
    Boolean(session.white_rematch_requested_at) &&
    Boolean(session.black_rematch_requested_at);

  return {
    roomCode: room.roomCode,
    roomStatus: room.status,
    roomClosedReason: room.closedReason,
    gameSessionId: session.id,
    gameNumber: session.game_number,
    gameStatus: session.status,
    fen: game.fen(),
    turn: CHESS_TURN_TO_PLAYER_COLOR[game.turn()],
    statusText: getStatusText(game, session),
    isCheck: game.isCheck(),
    isCheckmate: game.isCheckmate(),
    isDraw: game.isDraw(),
    isStalemate: game.isStalemate(),
    isGameOver: game.isGameOver() || session.status === "completed",
    result: session.result,
    winnerUsername: session.winner_username,
    lastMove: session.last_move,
    playerColor,
    rematch: {
      requestedByYou,
      requestedByOpponent,
      bothRequested,
    },
    canRequestRematch:
      session.status === "completed" && room.closedReason === "game_over",
    canStartNewGame:
      session.status === "completed" && room.closedReason === "game_over",
  };
}

async function getJoinableSession(room: RoomResponse) {
  if (room.status === "active" && room.closedReason === null) {
    return getOrCreateActiveGameSession(room);
  }

  if (room.status === "completed" && room.closedReason === "game_over") {
    const latestSession = await getLatestGameSession(room.id);

    if (!latestSession) {
      throw new OnlineGameServiceError("This completed room has no game.");
    }

    return latestSession;
  }

  throw new OnlineGameServiceError("This room is closed.");
}

export async function joinOnlineGame(roomCodeInput: string, userId: number) {
  const roomCode = normalizeRoomCode(roomCodeInput);

  if (!roomCode) {
    throw new OnlineGameServiceError("Room code is required.");
  }

  const room = await getRoomByCodeForUser(roomCode, userId);
  const session = await getJoinableSession(room);
  const game = getGame(session);

  return buildGameState(room, session, game, userId);
}

export async function getOnlineGameState(
  roomCodeInput: string,
  userId: number,
) {
  return joinOnlineGame(roomCodeInput, userId);
}

export async function makeOnlineMove(payload: MakeMovePayload, userId: number) {
  const roomCode = normalizeRoomCode(payload.roomCode);

  if (!roomCode) {
    throw new OnlineGameServiceError("Room code is required.");
  }

  const room = await getRoomByCodeForUser(roomCode, userId);

  if (room.status !== "active" || room.closedReason !== null) {
    throw new OnlineGameServiceError("This room is closed to new moves.");
  }

  const session = await getOrCreateActiveGameSession(room);
  const playerColor = getPlayerColor(session, userId);
  const expectedTurn = PLAYER_COLOR_TO_CHESS_TURN[playerColor];
  const game = getGame(session);

  if (session.status !== "active" || game.isGameOver()) {
    throw new OnlineGameServiceError("This game is already over.");
  }

  if (game.turn() !== expectedTurn) {
    throw new OnlineGameServiceError("It is not your turn.");
  }

  if (!isSquare(payload.from) || !isSquare(payload.to)) {
    throw new OnlineGameServiceError("Invalid move squares.");
  }

  const piece = game.get(payload.from);

  if (!piece) {
    throw new OnlineGameServiceError("No piece exists on that square.");
  }

  if (piece.color !== expectedTurn) {
    throw new OnlineGameServiceError("You can only move your own pieces.");
  }

  let move: Move;

  try {
    move = game.move({
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion ?? "q",
    });
  } catch {
    throw new OnlineGameServiceError("Illegal move.");
  }

  const lastMove = toLastMove(move);
  const result = getGameResult(game);
  const endedReason = getEndedReason(game);

  if (result && endedReason) {
    await pool.query(
      `
        UPDATE game_sessions
        SET status = 'completed',
            fen = $1,
            last_move = $2::jsonb,
            result = $3,
            winner_user_id = $4,
            ended_reason = $5,
            ended_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `,
      [
        game.fen(),
        JSON.stringify(lastMove),
        result,
        getWinnerUserId(session, result),
        endedReason,
        session.id,
      ],
    );

    activeGames.delete(session.id);
    await closeRoomAsGameOver(room.id);
  } else {
    await pool.query(
      `
        UPDATE game_sessions
        SET fen = $1,
            last_move = $2::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [game.fen(), JSON.stringify(lastMove), session.id],
    );

    activeGames.set(session.id, {
      game,
      fen: game.fen(),
    });
  }

  return room.roomCode;
}

export async function requestRematch(
  roomCodeInput: string,
  userId: number,
): Promise<RematchResult> {
  const room = await getRoomByCodeForUser(roomCodeInput, userId);

  if (room.closedReason !== "game_over") {
    throw new OnlineGameServiceError(
      "Rematch is only available after a completed game.",
    );
  }

  const latestSession = await getLatestGameSession(room.id);

  if (!latestSession || latestSession.status !== "completed") {
    throw new OnlineGameServiceError(
      "No completed game is available for rematch.",
    );
  }

  const playerColor = getPlayerColor(latestSession, userId);
  const requestColumn =
    playerColor === "white"
      ? "white_rematch_requested_at"
      : "black_rematch_requested_at";

  await pool.query(
    `
      UPDATE game_sessions
      SET ${requestColumn} = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [latestSession.id],
  );

  const updatedSession = await getLatestGameSession(room.id);

  if (
    updatedSession?.white_rematch_requested_at &&
    updatedSession.black_rematch_requested_at
  ) {
    const nextSession = await createGameSession(
      room,
      latestSession.black_user_id,
      latestSession.white_user_id,
      latestSession.game_number + 1,
    );

    await pool.query(
      `
        UPDATE rooms
        SET status = 'active',
            closed_reason = NULL,
            closed_by_user_id = NULL,
            closed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [room.id],
    );

    activeGames.delete(latestSession.id);
    activeGames.set(nextSession.id, {
      game: new Chess(nextSession.fen),
      fen: nextSession.fen,
    });

    return { roomCode: room.roomCode, started: true };
  }

  return { roomCode: room.roomCode, started: false };
}

export async function cancelRematch(roomCodeInput: string, userId: number) {
  const room = await getRoomByCodeForUser(roomCodeInput, userId);
  const latestSession = await getLatestGameSession(room.id);

  if (!latestSession || latestSession.status !== "completed") {
    throw new OnlineGameServiceError("No rematch request can be cancelled.");
  }

  const playerColor = getPlayerColor(latestSession, userId);
  const requestColumn =
    playerColor === "white"
      ? "white_rematch_requested_at"
      : "black_rematch_requested_at";

  await pool.query(
    `
      UPDATE game_sessions
      SET ${requestColumn} = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [latestSession.id],
  );

  return room.roomCode;
}

export async function startNewGameFromRoom(
  roomCodeInput: string,
  userId: number,
): Promise<StartNewGameResult> {
  const room = await getRoomByCodeForUser(roomCodeInput, userId);
  const latestSession = await getLatestGameSession(room.id);

  if (!latestSession || latestSession.status !== "completed") {
    throw new OnlineGameServiceError(
      "New Game is available only after the game ends.",
    );
  }

  const result = await closeRoomAndCreateNewRoom(room.roomCode, userId);

  activeGames.delete(latestSession.id);

  return {
    oldRoomCode: room.roomCode,
    newRoomCode: result.newRoom.roomCode,
    requesterUserId: userId,
    opponentUserId: result.opponentUserId,
  };
}
