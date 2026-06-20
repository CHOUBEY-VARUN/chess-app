import { useState, type FormEvent, type ReactNode } from "react";

type AuthFormProps = {
  submitLabel: string;
  error: string | null;
  footer: ReactNode;
  onSubmit: (username: string, password: string) => Promise<void>;
};

function AuthForm({ submitLabel, error, footer, onSubmit }: AuthFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(username, password);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            minLength={3}
            maxLength={20}
            required
            disabled={isSubmitting}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            minLength={8}
            required
            disabled={isSubmitting}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="auth-button" disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : submitLabel}
        </button>
      </form>

      <div className="auth-footer">{footer}</div>
    </>
  );
}

export default AuthForm;
