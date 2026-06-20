import { Link } from "react-router-dom";
import ChessIllustration from "../components/shared/ChessIllustration";
import PillNav from "../components/shared/PillNav";
import "../components/home/auth/Auth.css";
import { useAuth } from "../hooks/useAuth";

function Account() {
  const { user, logoutUser } = useAuth();
  const username = user?.username ?? "Player";

  return (
    <div className="account-page">
      <PillNav />

      <main className="account-layout">
        <section className="account-hero">
          <div className="account-hero__copy">
            <p className="eyebrow">Player card</p>
            <h1>{username}'s chess corner.</h1>
            <p>
              Your account is ready for the room links, board states, and future
              match history that will gather here.
            </p>
          </div>

          <div className="account-actions">
            <Link to="/" className="secondary-button">
              Home
            </Link>
            <button
              type="button"
              className="pill-button pill-button--coral"
              onClick={logoutUser}
            >
              Logout
            </button>
          </div>
        </section>

        <section className="account-panel" aria-labelledby="account-panel-title">
          <div className="account-panel__header">
            <p className="eyebrow">Signed in</p>
            <h2 id="account-panel-title">Ready at the table</h2>
          </div>

          <span className="account-badge">Logged in as {username}</span>
          <ChessIllustration variant="compact" className="account-illustration" />
        </section>
      </main>
    </div>
  );
}

export default Account;
