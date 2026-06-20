const BOARD_SQUARES = Array.from({ length: 64 }, (_, index) => ({
  id: index,
  isLight: (Math.floor(index / 8) + index) % 2 === 0,
}));

const PIECES: Record<number, string> = {
  3: "queen",
  4: "king",
  10: "knight",
  12: "bishop",
  28: "pawn",
  35: "pawn",
  51: "rook",
  60: "king",
};

function ChessBoardPreview() {
  return (
    <div className="chess-board-preview" aria-hidden="true">
      {BOARD_SQUARES.map((square) => {
        const piece = PIECES[square.id];

        return (
          <div
            key={square.id}
            className={`square ${square.isLight ? "light" : "dark"}`}
          >
            {piece && <span className={`square-piece square-piece--${piece}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default ChessBoardPreview;
