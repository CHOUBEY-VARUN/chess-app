import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Account() {
  const { user ,logoutUser} = useAuth();

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">
          ChessRoom
        </Link>

        <h1>Account</h1>
        <p>Logged in as {user?.username}</p>
        <button type="button" className="nav-button" onClick={logoutUser}>
              Logout
            </button>
      </section>
    </main>
  );
}

export default Account;