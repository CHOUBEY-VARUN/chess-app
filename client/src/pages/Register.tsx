import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthForm from "../components/home/auth/AuthForm";
import "../components/home/auth/Auth.css";
import { useAuth } from "../hooks/useAuth";

function Register() {
  const { user, registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/account" replace />;
  }

  async function handleRegister(username: string, password: string) {
    setError(null);

    try {
      await registerUser(username, password);
      navigate("/account", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">
          ChessRoom
        </Link>

        <h1>Create Account</h1>
        <p>Choose a username and start playing real-time chess.</p>

        <AuthForm
          submitLabel="Register"
          error={error}
          onSubmit={handleRegister}
          footer={
            <>
              Already have an account? <Link to="/login">Login</Link>
            </>
          }
        />
      </section>
    </main>
  );
}

export default Register;