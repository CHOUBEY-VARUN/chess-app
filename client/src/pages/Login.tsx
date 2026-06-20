import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/account" className="auth-brand">
          ChessRoom
        </Link>

        <h1>Login</h1>
        <p>Welcome back. Continue to your chess rooms.</p>

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
  );
}

export default Login;