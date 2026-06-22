import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createRoom } from "../api/roomApi";
import PillNav from "../components/shared/PillNav";
import { useAuth } from "../hooks/useAuth";
import "./Lobby.css";

function Lobby() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRoom() {
    if (!token) {
      setError("You must be logged in to create a room.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await createRoom(token);
      navigate(`/rooms/${response.room.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsCreating(false);
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
            Create a private chess room, share the room code, and get ready for
            the first real-time multiplayer layer.
          </p>
        </section>

        <section className="lobby-card" aria-labelledby="create-room-title">
          <div className="lobby-card__copy">
            <h2 id="create-room-title">Create a room</h2>
            <p>
              This creates a waiting room in PostgreSQL and gives you a room
              code. Online play and Socket.IO will come later.
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
              disabled={isCreating}
              onClick={handleCreateRoom}
            >
              {isCreating ? "Creating..." : "Create Room"}
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