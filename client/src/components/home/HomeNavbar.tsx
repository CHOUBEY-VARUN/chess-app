import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function HomeNavbar() {
  const { user, logoutUser } = useAuth();

  return (
    <nav className="navbar">
      <h2 className="logo">ChessRoom</h2>

      <div className="nav-links">
        {user ? (
          <>
            <Link to="/account">{user.username}</Link>
            <button type="button" className="nav-button" onClick={logoutUser}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="nav-button">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default HomeNavbar;