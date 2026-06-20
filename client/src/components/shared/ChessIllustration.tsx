type ChessIllustrationProps = {
  className?: string;
  boardPosition?: "decorative" | "immortal";
  variant?: "hero" | "compact";
};

type BoardPiece = {
  color: "black" | "white";
  symbol: string;
};

function createBoardTiles(size: number) {
  return Array.from({ length: size * size }, (_, index) => ({
    id: index,
    isLight: (Math.floor(index / size) + index) % 2 === 0,
  }));
}

const DECORATIVE_BOARD_TILES = createBoardTiles(4);
const IMMORTAL_BOARD_TILES = createBoardTiles(8);

const IMMORTAL_GAME_POSITION: Record<number, BoardPiece> = {
  0: { color: "black", symbol: "\u265C" },
  2: { color: "black", symbol: "\u265D" },
  3: { color: "black", symbol: "\u265A" },
  6: { color: "black", symbol: "\u265E" },
  7: { color: "black", symbol: "\u265C" },
  8: { color: "black", symbol: "\u265F" },
  11: { color: "black", symbol: "\u265F" },
  13: { color: "black", symbol: "\u265F" },
  14: { color: "white", symbol: "\u2658" },
  15: { color: "black", symbol: "\u265F" },
  16: { color: "black", symbol: "\u265E" },
  19: { color: "white", symbol: "\u2657" },
  25: { color: "black", symbol: "\u265F" },
  27: { color: "white", symbol: "\u2658" },
  28: { color: "white", symbol: "\u2659" },
  31: { color: "white", symbol: "\u2659" },
  38: { color: "white", symbol: "\u2659" },
  43: { color: "white", symbol: "\u2659" },
  45: { color: "white", symbol: "\u2655" },
  48: { color: "white", symbol: "\u2659" },
  50: { color: "white", symbol: "\u2659" },
  52: { color: "white", symbol: "\u2654" },
  56: { color: "black", symbol: "\u265B" },
  62: { color: "black", symbol: "\u265D" },
};

function ChessIllustration({
  boardPosition = "decorative",
  className = "",
  variant = "hero",
}: ChessIllustrationProps) {
  const isImmortalPosition = boardPosition === "immortal";
  const boardTiles = isImmortalPosition
    ? IMMORTAL_BOARD_TILES
    : DECORATIVE_BOARD_TILES;
  const rootClassName = [
    "chess-illustration",
    `chess-illustration--${variant}`,
    isImmortalPosition ? "chess-illustration--immortal" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} aria-hidden="true">
      <span className="chess-illustration__sticker chess-illustration__sticker--sun" />
      <span className="chess-illustration__sticker chess-illustration__sticker--coral" />

      <div className="chess-illustration__board">
        {boardTiles.map((tile) => {
          const piece = isImmortalPosition
            ? IMMORTAL_GAME_POSITION[tile.id]
            : null;

          return (
            <span
              key={tile.id}
              className={`chess-illustration__tile ${
                tile.isLight
                  ? "chess-illustration__tile--light"
                  : "chess-illustration__tile--dark"
              }`}
            >
              {piece && (
                <span
                  className={`chess-illustration__board-piece chess-illustration__board-piece--${piece.color}`}
                >
                  {piece.symbol}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {!isImmortalPosition && (
        <>
          <span className="chess-illustration__piece chess-illustration__piece--queen" />
          <span className="chess-illustration__piece chess-illustration__piece--king" />
          <span className="chess-illustration__piece chess-illustration__piece--knight" />
        </>
      )}

    </div>
  );
}

export default ChessIllustration;
