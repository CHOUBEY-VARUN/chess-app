import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { joinRoomByCode, quickPlay } from "../api/roomApi";
import PillNav from "../components/shared/PillNav";
import { useAuth } from "../hooks/useAuth";
import "./Lobby.css";

function Lobby() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [quickPlayError, setQuickPlayError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handlePlay() {
    if (!token) {
      setQuickPlayError("You must be logged in to play.");
      return;
    }

    setIsPlaying(true);
    setQuickPlayError(null);
    setJoinError(null);

    try {
      const response = await quickPlay(token);
      navigate(`/rooms/${response.room.roomCode}`, {
        state: { quickPlayAction: response.action },
      });
    } catch (err) {
      setQuickPlayError(
        err instanceof Error ? err.message : "Failed to start quick play",
      );
    } finally {
      setIsPlaying(false);
    }
  }

  async function handleJoinByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedJoinCode = joinCode.trim().toUpperCase();

    if (!token) {
      setJoinError("You must be logged in to join a room.");
      return;
    }

    if (!normalizedJoinCode) {
      setJoinError("Enter a room code.");
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    setQuickPlayError(null);

    try {
      const response = await joinRoomByCode(token, normalizedJoinCode);
      navigate(`/rooms/${response.room.roomCode}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setIsJoining(false);
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

          {quickPlayError && (
            <p className="lobby-error" role="alert">
              {quickPlayError}
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

          <div className="lobby-divider" aria-hidden="true" />

          <form
            className="join-room-form"
            aria-labelledby="join-room-title"
            onSubmit={handleJoinByCode}
          >
            <div className="lobby-card__copy">
              <h2 id="join-room-title">Join by code</h2>
              <p>Enter a room code from a waiting room to join as opponent.</p>
            </div>

            <div className="join-room-form__row">
              <div className="join-room-form__field">
                <label htmlFor="join-room-code">Room code</label>
                <input
                  id="join-room-code"
                  value={joinCode}
                  maxLength={6}
                  autoComplete="off"
                  disabled={isJoining}
                  placeholder="ABC123"
                  onChange={(event) =>
                    setJoinCode(event.target.value.toUpperCase())
                  }
                />
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={isJoining}
              >
                {isJoining ? "Joining..." : "Join"}
              </button>
            </div>

            {joinError && (
              <p className="lobby-error" role="alert">
                {joinError}
              </p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}

export default Lobby;
