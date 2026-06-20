import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import ChessIllustration from "../components/shared/ChessIllustration";
import PillNav from "../components/shared/PillNav";
import AuthForm from "../components/home/auth/AuthForm";
import "../components/home/auth/Auth.css";
import { useAuth } from "../hooks/useAuth";

function Login() {
  const { user, loginUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/account" replace />;
  }

  async function handleLogin(username: string, password: string) {
    setError(null);

    try {
      await loginUser(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="auth-page">
      <PillNav />

      <main className="auth-layout">
        <section className="auth-copy" aria-labelledby="login-heading">
          <p className="eyebrow">Player entrance</p>
          <h1 id="login-heading">Welcome back.</h1>
          <p>
            Step into your corner of the chess room and pick up the next match
            from a calm, familiar board.
          </p>
          <ChessIllustration variant="compact" className="auth-illustration" />
        </section>

        <section className="auth-card" aria-labelledby="login-form-heading">
          <h2 id="login-form-heading">Login</h2>
          <p>Use your username and password to continue.</p>

          <AuthForm
            submitLabel="Login"
            error={error}
            onSubmit={handleLogin}
            footer={
              <>
                New here? <Link to="/register">Create an account</Link>
              </>
            }
          />
        </section>
      </main>
    </div>
  );
}

export default Login;
