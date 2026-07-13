import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-400">
        Loading ChatFlow...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
