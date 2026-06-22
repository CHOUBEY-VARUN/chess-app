import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

type PillNavProps = {
  className?: string;
};

function PillNav({ className = "" }: PillNavProps) {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isLobby = location.pathname === "/lobby";
  const wrapperClassName = ["pill-nav-wrap", className]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={wrapperClassName}>
      <nav className="pill-nav" aria-label="Primary navigation">
        <Link to="/" className="pill-nav__brand" aria-label="ChessRoom home">
          <span className="pill-nav__brand-mark" aria-hidden="true" />
          ChessRoom
        </Link>

        <div className="pill-nav__links">
          {!isHome && (
            <Link to="/" className="pill-nav__link">
              Home
            </Link>
          )}

          {user ? (
            <>
              {!isLobby && (
                <Link to="/lobby" className="pill-nav__link">
                  Lobby
                </Link>
              )}
              <Link
                to="/account"
                className="pill-nav__link pill-nav__link--user"
              >
                {user.username}
              </Link>
              <button
                type="button"
                className="pill-nav__button pill-nav__button--coral"
                onClick={logoutUser}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="pill-nav__link">
                Login
              </Link>
              <Link to="/register" className="pill-nav__button">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default PillNav;
