const BOARD_SQUARES = Array.from({ length: 64 }, (_, index) => ({
  id: index,
  isLight: (Math.floor(index / 8) + index) % 2 === 0,
}));

function ChessBoardPreview() {
  return (
    <div className="chess-board-preview">
      {BOARD_SQUARES.map((square) => (
        <div
          key={square.id}
          className={`square ${square.isLight ? "light" : "dark"}`}
        />
      ))}
    </div>
  );
}

export default ChessBoardPreview;
