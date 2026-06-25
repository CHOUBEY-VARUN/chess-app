import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard, type ChessboardOptions } from "react-chessboard";
import {
  createOnlineChessSocket,
  type OnlineChessSocket,
  type OnlineGameState,
  type PlayerColor,
} from "../../sockets/socket";

type OnlineChessGameProps = {
  roomCode: string;
  token: string;
  className?: string;
  onRedirectToRoom?: (roomCode: string) => void;
  onRedirectToLobby?: (message: string) => void;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const COLOR_LABELS: Record<PlayerColor, string> = {
  white: "White",
  black: "Black",
};

const RESULT_LABELS: Record<NonNullable<OnlineGameState["result"]>, string> = {
  white_win: "White wins",
  black_win: "Black wins",
  draw: "Draw",
};

const PIECE_COLOR_PREFIX: Record<PlayerColor, "w" | "b"> = {
  white: "w",
  black: "b",
};

function getConnectionLabel(status: ConnectionStatus) {
  switch (status) {
    case "connecting":
      return "Connecting";
    case "connected":
      return "Connected";
    case "disconnected":
      return "Disconnected";
    default:
      return status;
  }
}

function getPostGameTitle(gameState: OnlineGameState) {
  if (gameState.winnerUsername) {
    return `${gameState.winnerUsername} wins`;
  }

  if (gameState.result) {
    return RESULT_LABELS[gameState.result];
  }

  return "Game over";
}

function OnlineChessGame({
  roomCode,
  token,
  className = "",
  onRedirectToRoom,
  onRedirectToLobby,
}: OnlineChessGameProps) {
  const socketRef = useRef<OnlineChessSocket | null>(null);
  const [gameState, setGameState] = useState<OnlineGameState | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    const socket = createOnlineChessSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setConnectionError(null);
      socket.emit("joinRoom", { roomCode });
    });

    socket.on("connect_error", (error) => {
      setConnectionStatus("disconnected");
      setConnectionError(error.message || "Could not connect to the game.");
    });

    socket.on("disconnect", (reason) => {
      setConnectionStatus("disconnected");

      if (reason !== "io client disconnect") {
        setConnectionError("Disconnected from the game server.");
      }
    });

    socket.on("gameState", (state) => {
      setGameState(state);
      setConnectionError(null);
      setMoveError(null);
    });

    socket.on("gameOver", (state) => {
      setGameState(state);
      setMoveError(null);
    });

    socket.on("rematchUpdated", (state) => {
      setGameState(state);
      setMoveError(null);
    });

    socket.on("rematchStarted", (state) => {
      setGameState(state);
      setConnectionError(null);
      setMoveError(null);
    });

    socket.on("roomClosed", (payload) => {
      setConnectionError(payload.message);
    });

    socket.on("redirectToRoom", (payload) => {
      onRedirectToRoom?.(payload.roomCode);
    });

    socket.on("redirectToLobby", (payload) => {
      onRedirectToLobby?.(payload.message);
    });

    socket.on("roomError", (error) => {
      setConnectionError(error.message);
    });

    socket.on("moveRejected", (error) => {
      setMoveError(error.message);
    });

    socket.connect();

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [onRedirectToLobby, onRedirectToRoom, roomCode, token]);

  const isMyTurn = Boolean(
    gameState && gameState.turn === gameState.playerColor,
  );

  const canInteract = Boolean(
    gameState && connectionStatus === "connected" && !gameState.isGameOver,
  );

  const chessboardOptions = useMemo<ChessboardOptions>(
    () => ({
      id: `online-chess-game-board-${roomCode}`,
      position: gameState?.fen,
      boardOrientation: gameState?.playerColor ?? "white",
      showNotation: true,
      showAnimations: true,
      animationDurationInMs: 180,
      allowDragging: canInteract && isMyTurn,
      allowDrawingArrows: false,
      boardStyle: {
        border: "2px solid var(--color-ink-black)",
        borderRadius: "34px",
        overflow: "hidden",
        background: "var(--color-ink-black)",
      },
      lightSquareStyle: {
        backgroundColor: "var(--color-cream-paper)",
      },
      darkSquareStyle: {
        backgroundColor: "var(--color-fresh-grass)",
      },
      canDragPiece: ({ piece }) => {
        if (!gameState || !canInteract || !isMyTurn) {
          return false;
        }

        return piece.pieceType[0] === PIECE_COLOR_PREFIX[gameState.playerColor];
      },
      onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
        if (!gameState || !targetSquare) {
          return false;
        }

        if (!canInteract) {
          setMoveError("The game is not ready for moves.");
          return false;
        }

        if (!isMyTurn) {
          setMoveError(`${COLOR_LABELS[gameState.turn]} to move.`);
          return false;
        }

        if (piece.pieceType[0] !== PIECE_COLOR_PREFIX[gameState.playerColor]) {
          setMoveError("You can only move your own pieces.");
          return false;
        }

        if (!socketRef.current?.connected) {
          setMoveError("Still connecting to the game server.");
          return false;
        }

        socketRef.current.emit("makeMove", {
          roomCode,
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });

        setMoveError(null);
        return false;
      },
    }),
    [canInteract, gameState, isMyTurn, roomCode],
  );

  function handleRequestRematch() {
    socketRef.current?.emit("requestRematch", { roomCode });
  }

  function handleCancelRematch() {
    socketRef.current?.emit("cancelRematch", { roomCode });
  }

  function handleStartNewGame() {
    socketRef.current?.emit("startNewGame", { roomCode });
  }

  const rootClassName = ["online-chess-game", className]
    .filter(Boolean)
    .join(" ");

  const connectionLabel = getConnectionLabel(connectionStatus);

  const lastMoveText = gameState?.lastMove
    ? `${COLOR_LABELS[gameState.lastMove.color]} played ${gameState.lastMove.san}`
    : null;

  const showPostGameActions = Boolean(
    gameState?.isGameOver && gameState.canStartNewGame,
  );

  return (
    <section className={rootClassName} aria-label="Online chess game">
      <div className="online-chess-game__board-wrap">
        {gameState ? (
          <Chessboard options={chessboardOptions} />
        ) : (
          <div className="online-chess-game__board-placeholder">
            Connecting board...
          </div>
        )}
      </div>

      <aside className="online-chess-game__panel">
        <div className="online-chess-game__status-block">
          <p className="eyebrow">Online game</p>
          <h2>{gameState?.statusText ?? "Connecting to game"}</h2>
          <p>
            Turn:{" "}
            {gameState ? COLOR_LABELS[gameState.turn] : "Waiting for state"}
          </p>
        </div>

        <ul className="online-chess-game__facts">
          <li>
            Color:{" "}
            {gameState ? COLOR_LABELS[gameState.playerColor] : "Assigning"}
          </li>
          <li>
            Game: {gameState ? `#${gameState.gameNumber}` : "Preparing"}
          </li>
          <li>
            Connection:{" "}
            <span
              className={`online-chess-game__connection online-chess-game__connection--${connectionStatus}`}
            >
              {connectionLabel}
            </span>
          </li>
          <li>{isMyTurn ? "Your move" : "Waiting for opponent"}</li>
        </ul>

        {lastMoveText && (
          <p className="online-chess-game__message" aria-live="polite">
            {lastMoveText}
          </p>
        )}

        {connectionError && (
          <p className="online-chess-game__error" role="alert">
            {connectionError}
          </p>
        )}

        {moveError && (
          <p className="online-chess-game__error" role="alert">
            {moveError}
          </p>
        )}

        {showPostGameActions && gameState && (
          <div className="online-chess-game__post-game">
            <div className="online-chess-game__post-game-copy">
              <p className="eyebrow">Game over</p>
              <h3>{getPostGameTitle(gameState)}</h3>
              <p>
                Request a rematch to keep this room. Both players must agree,
                and colors flip for the next game.
              </p>
            </div>

            {gameState.rematch.requestedByOpponent &&
              !gameState.rematch.requestedByYou && (
                <p className="online-chess-game__message">
                  Your opponent requested a rematch.
                </p>
              )}

            {gameState.rematch.requestedByYou &&
              !gameState.rematch.bothRequested && (
                <p className="online-chess-game__message">
                  Waiting for your opponent to accept the rematch.
                </p>
              )}

            <div className="online-chess-game__post-game-actions">
              {gameState.rematch.requestedByYou ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCancelRematch}
                >
                  Cancel rematch
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleRequestRematch}
                >
                  Rematch
                </button>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={handleStartNewGame}
              >
                New game
              </button>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}

export default OnlineChessGame;
