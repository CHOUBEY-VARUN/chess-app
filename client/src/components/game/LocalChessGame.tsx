import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard, type ChessboardOptions } from "react-chessboard";

type LocalChessGameProps = {
  className?: string;
  initialFen?: string;
};

const TURN_LABELS = {
  w: "White",
  b: "Black",
} as const;

function createGame(initialFen?: string) {
  return initialFen ? new Chess(initialFen) : new Chess();
}

function getWinner(game: Chess) {
  return game.turn() === "w" ? "Black" : "White";
}

function getGameStatus(game: Chess) {
  const currentTurn = TURN_LABELS[game.turn()];

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

function LocalChessGame({ className = "", initialFen }: LocalChessGameProps) {
  const [game, setGame] = useState(() => createGame(initialFen));
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const currentTurn = TURN_LABELS[game.turn()];
  const isGameOver = game.isGameOver();
  const status = getGameStatus(game);

  function resetGame() {
    setGame(createGame(initialFen));
    setLastMove(null);
    setMoveError(null);
  }

  const chessboardOptions = useMemo<ChessboardOptions>(
    () => ({
      id: "local-chess-game-board",
      position: game.fen(),
      boardOrientation: "white",
      showNotation: true,
      showAnimations: true,
      animationDurationInMs: 180,
      allowDragging: !isGameOver,
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
        return !isGameOver && piece.pieceType[0] === game.turn();
      },
      onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
        if (!targetSquare || isGameOver) {
          return false;
        }

        if (piece.pieceType[0] !== game.turn()) {
          setMoveError(`${currentTurn} to move.`);
          return false;
        }

        const nextGame = new Chess(game.fen());

        try {
          const move = nextGame.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
          });

          setGame(nextGame);
          setLastMove(`${TURN_LABELS[move.color]} played ${move.san}`);
          setMoveError(null);

          return true;
        } catch {
          setMoveError("Illegal move. Try a legal chess move.");
          return false;
        }
      },
    }),
    [currentTurn, game, isGameOver],
  );

  const rootClassName = ["local-chess-game", className].filter(Boolean).join(" ");

  return (
    <section className={rootClassName} aria-label="Local chess game">
      <div className="local-chess-game__board-wrap">
        <Chessboard options={chessboardOptions} />
      </div>

      <aside className="local-chess-game__panel">
        <div className="local-chess-game__status-block">
          <p className="eyebrow">Current game</p>
          <h2>{status}</h2>
          <p>Turn: {currentTurn}</p>
        </div>

        {lastMove && (
          <p className="local-chess-game__message" aria-live="polite">
            {lastMove}
          </p>
        )}

        {moveError && (
          <p className="local-chess-game__error" role="alert">
            {moveError}
          </p>
        )}

        <button
          type="button"
          className="local-chess-game__reset"
          onClick={resetGame}
        >
          Reset game
        </button>
      </aside>
    </section>
  );
}

export default LocalChessGame;