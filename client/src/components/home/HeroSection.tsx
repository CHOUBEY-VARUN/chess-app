import { Link } from "react-router-dom";
import ChessBoardPreview from "./ChessBoardPreview";

function HeroSection() {
  return (
    <main className="hero">
      <section className="hero-content">
        <p className="eyebrow">Real-Time Multiplayer Chess</p>

        <h1>Play chess with friends in real time.</h1>

        <p className="hero-text">
          Create a private chess room, invite another player, and play a legal
          real-time game with a clean and focused interface.
        </p>

        <div className="hero-actions">
          <Link to="/register" className="primary-button">
            Get Started
          </Link>

          <Link to="/login" className="secondary-button">
            Login
          </Link>
        </div>
      </section>

      <section className="hero-card" aria-label="Chess board preview">
        <ChessBoardPreview />
      </section>
    </main>
  );
}

export default HeroSection;
