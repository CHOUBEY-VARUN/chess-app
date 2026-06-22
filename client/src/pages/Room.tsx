import { Link, useParams } from "react-router-dom";
import PillNav from "../components/shared/PillNav";
import "./Room.css";

function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();

  return (
    <div className="room-page">
      <PillNav />

      <main className="room-main">
        <section className="room-hero">
          <p className="eyebrow">Waiting room</p>
          <h1>Room {roomCode ?? "unknown"}</h1>
          <p>
            Share this room code with your opponent. This page is only a shell
            for now; real-time presence and online gameplay will come later.
          </p>
        </section>

        <section className="room-card" aria-labelledby="room-status-title">
          <div className="room-code-badge">{roomCode ?? "No room code"}</div>

          <div className="room-card__copy">
            <h2 id="room-status-title">Waiting for opponent</h2>
            <p>
              The room exists in the database. The next feature will add joining
              and real-time connection behavior.
            </p>
          </div>

          <Link to="/lobby" className="secondary-button">
            Back to lobby
          </Link>
        </section>
      </main>
    </div>
  );
}

export default Room;