import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import ChessIllustration from "../shared/ChessIllustration";

function HeroSection() {
  const { user } = useAuth();

  return (
    <main className="home-main">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Real-time chess rooms</p>

          <h1>Play chess together, from anywhere.</h1>

          <p className="hero-text">
            Create a room, invite a friend, and settle into a focused live chess
            game with a warm little corner of the internet around the board.
          </p>

          <div className="hero-actions">
            <Link to={user ? "/account" : "/register"} className="primary-button">
              {user ? "Open account" : "Create a room"}
            </Link>

            <Link to={user ? "/account" : "/login"} className="secondary-button">
              {user ? "Player card" : "Login"}
            </Link>
          </div>
        </div>

        <ChessIllustration
          boardPosition="immortal"
          className="hero-illustration"
        />
      </section>
    </main>
  );
}

export default HeroSection;
