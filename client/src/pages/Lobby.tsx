import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { quickPlay } from "../api/roomApi";
import PillNav from "../components/shared/PillNav";
import { useAuth } from "../hooks/useAuth";
import "./Lobby.css";

function Lobby() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePlay() {
    if (!token) {
      setError("You must be logged in to play.");
      return;
    }

    setIsPlaying(true);
    setError(null);

    try {
      const response = await quickPlay(token);
      navigate(`/rooms/${response.room.roomCode}`, {
        state: { quickPlayAction: response.action },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start quick play",
      );
    } finally {
      setIsPlaying(false);
    }
  }

  return (
    <div className="lobby-page">
      <PillNav />

      <main className="lobby-main">
        <section className="lobby-hero">
          <p className="eyebrow">Online rooms</p>
          <h1>Lobby</h1>
          <p>
            Start quick play to create a waiting room or join the oldest
            available opponent. Real-time gameplay will come in the next layer.
          </p>
        </section>

        <section className="lobby-card" aria-labelledby="quick-play-title">
          <div className="lobby-card__copy">
            <h2 id="quick-play-title">Quick play</h2>
            <p>
              The backend will match you into a waiting room when one exists,
              or create a new room code when you are first in line.
            </p>
          </div>

          {error && (
            <p className="lobby-error" role="alert">
              {error}
            </p>
          )}

          <div className="lobby-actions">
            <button
              type="button"
              className="primary-button"
              disabled={isPlaying}
              onClick={handlePlay}
            >
              {isPlaying ? "Finding game..." : "Play"}
            </button>

            <Link to="/local-game" className="secondary-button">
              Play local
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Lobby;
