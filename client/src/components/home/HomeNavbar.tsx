import { Link } from "react-router-dom";

type NavLink = {
  label: string;
  to: string;
  className?: string;
};

const NAV_LINKS: readonly NavLink[] = [
  { label: "Login", to: "/login" },
  { label: "Register", to: "/register", className: "nav-button" },
];

function HomeNavbar() {
  return (
    <nav className="navbar">
      <h2 className="logo">ChessRoom</h2>

      <div className="nav-links">
        {NAV_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className={link.className}>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default HomeNavbar;
