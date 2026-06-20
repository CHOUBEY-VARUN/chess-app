import { Navigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import type { ReactNode } from "react";

type ProtectedRouteProps = {
  children: ReactNode;
};

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="protected-loading" aria-live="polite">
        <section className="protected-loading__card">
          <span className="protected-loading__mark" aria-hidden="true" />
          <p>Setting the board...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
