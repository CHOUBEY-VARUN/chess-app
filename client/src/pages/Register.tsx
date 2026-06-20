import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import ChessIllustration from "../components/shared/ChessIllustration";
import PillNav from "../components/shared/PillNav";
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
    <div className="auth-page">
      <PillNav />

      <main className="auth-layout">
        <section className="auth-copy" aria-labelledby="register-heading">
          <p className="eyebrow">New player</p>
          <h1 id="register-heading">Join the room.</h1>
          <p>
            Create a chess identity, save your seat, and get ready to invite a
            friend into a live match.
          </p>
          <ChessIllustration variant="compact" className="auth-illustration" />
        </section>

        <section className="auth-card" aria-labelledby="register-form-heading">
          <h2 id="register-form-heading">Create account</h2>
          <p>Pick a username and a sturdy password.</p>

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
    </div>
  );
}

export default Register;
