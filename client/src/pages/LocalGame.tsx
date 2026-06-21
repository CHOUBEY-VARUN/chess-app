import LocalChessGame from "../components/game/LocalChessGame";
import PillNav from "../components/shared/PillNav";
import "./LocalGame.css";

function LocalGame() {
  return (
    <div className="local-game-page">
      <PillNav />

      <main className="local-game-main">
        <section className="local-game-hero">
          <p className="eyebrow">Same-device chess</p>
          <h1>Play a local game.</h1>
          <p>
            Take turns on one device. Moves are checked by chess.js, so illegal
            moves stay off the board.
          </p>
        </section>

        <div className="local-game-card">
          <LocalChessGame />
        </div>
      </main>
    </div>
  );
}

export default LocalGame;