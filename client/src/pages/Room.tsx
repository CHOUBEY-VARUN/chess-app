import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRoomByCode, type Room as RoomData } from "../api/roomApi";
import OnlineChessGame from "../components/game/OnlineChessGame";
import PillNav from "../components/shared/PillNav";
import { useAuth } from "../hooks/useAuth";
import "./Room.css";

function getRoomStatusLabel(status: RoomData["status"]) {
  switch (status) {
    case "waiting":
      return "Waiting for opponent";
    case "active":
      return "Opponent found";
    case "completed":
      return "Game completed";
    case "cancelled":
      return "Room cancelled";
    default:
      return status;
  }
}

function getClosedRoomMessage(room: RoomData) {
  if (room.closedReason === "new_game") {
    return "This room was closed because a player started a new game.";
  }

  if (room.closedReason === "game_over") {
    return "This game has ended. You can request a rematch or start a new game.";
  }

  if (room.closedReason === "cancelled") {
    return "This room was cancelled.";
  }

  return null;
}

function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    let refreshTimeoutId: number | undefined;

    async function loadRoom(showLoading: boolean) {
      if (!token) {
        setError("You must be logged in to view this room.");
        setIsLoading(false);
        return;
      }

      if (!roomCode) {
        setError("No room code was provided.");
        setIsLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }

        setError(null);

        const response = await getRoomByCode(token, roomCode);

        if (!ignore) {
          setRoom(response.room);

          if (response.room.status === "waiting") {
            refreshTimeoutId = window.setTimeout(() => {
              void loadRoom(false);
            }, 3000);
          }
        }
      } catch (err) {
        if (!ignore) {
          setRoom(null);
          setError(err instanceof Error ? err.message : "Failed to load room");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadRoom(true);

    return () => {
      ignore = true;

      if (refreshTimeoutId) {
        window.clearTimeout(refreshTimeoutId);
      }
    };
  }, [roomCode, token]);

  const handleRedirectToRoom = useCallback(
    (nextRoomCode: string) => {
      navigate(`/rooms/${nextRoomCode}`, {
        replace: true,
        state: { notice: "New game room created." },
      });
    },
    [navigate],
  );

  const handleRedirectToLobby = useCallback(
    (message: string) => {
      navigate("/lobby", {
        replace: true,
        state: { notice: message },
      });
    },
    [navigate],
  );

  const displayRoomCode = room?.roomCode ?? roomCode ?? "unknown";
  const playerRole =
    room && user?.id === room.hostUserId
      ? "Host"
      : room && user?.id === room.opponentUserId
        ? "Opponent"
        : null;
  const isAssignedPlayer = Boolean(
    room &&
      user &&
      (user.id === room.hostUserId || user.id === room.opponentUserId),
  );
  const canShowCompletedPostGame = Boolean(
    room?.status === "completed" && room.closedReason === "game_over",
  );
  const shouldShowOnlineGame = Boolean(
    room &&
      token &&
      isAssignedPlayer &&
      (room.status === "active" || canShowCompletedPostGame),
  );
  const closedRoomMessage = room ? getClosedRoomMessage(room) : null;

  return (
    <div className="room-page">
      <PillNav />

      <main
        className={
          shouldShowOnlineGame ? "room-main room-main--active" : "room-main"
        }
      >
        <section className="room-hero">
          <p className="eyebrow">Chess room</p>
          <h1>Room {displayRoomCode}</h1>
          <p>
            This room is loaded through the backend and only visible to assigned
            players. Once both players are present, the online board connects in
            real time.
          </p>
        </section>

        <section className="room-card" aria-labelledby="room-status-title">
          {isLoading && (
            <>
              <div className="room-code-badge">Loading</div>

              <div className="room-card__copy">
                <h2 id="room-status-title">Loading room</h2>
                <p>Checking the room code and your access.</p>
              </div>
            </>
          )}

          {!isLoading && error && (
            <>
              <div className="room-code-badge">Unavailable</div>

              <div className="room-card__copy">
                <h2 id="room-status-title">Could not load room</h2>
                <p>{error}</p>
              </div>
            </>
          )}

          {!isLoading && !error && room && (
            <>
              <div className="room-code-badge">{room.roomCode}</div>

              <div className="room-card__copy">
                <h2 id="room-status-title">
                  {getRoomStatusLabel(room.status)}
                </h2>
                <p>Status: {room.status}</p>
                <p>Your role: {playerRole ?? "Assigned player"}</p>
                <p>Host: {room.hostUsername}</p>
                <p>
                  Opponent:{" "}
                  {room.opponentUsername ?? "Waiting for opponent"}
                </p>
                <p>
                  {room.opponentUserId
                    ? "Both players are assigned to this room."
                    : "Waiting for quick play to match an opponent."}
                </p>
                {closedRoomMessage && <p>{closedRoomMessage}</p>}
              </div>
            </>
          )}

          <Link to="/lobby" className="secondary-button">
            Back to lobby
          </Link>
        </section>

        {shouldShowOnlineGame && room && token && (
          <section className="room-game-card">
            <OnlineChessGame
              key={room.roomCode}
              roomCode={room.roomCode}
              token={token}
              onRedirectToRoom={handleRedirectToRoom}
              onRedirectToLobby={handleRedirectToLobby}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default Room;
