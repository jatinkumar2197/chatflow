import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUserByQr } from "../services/api";

/**
 * Handles deep links like https://yourapp.com/chat/{qr_uuid}. If the user
 * is logged in, resolves the UUID and opens/starts that conversation in
 * the Dashboard. Requires auth (wrapped in ProtectedRoute), so an
 * unauthenticated visitor is redirected to /login first, then can be
 * sent back here after logging in.
 */
export default function ChatDeepLink() {
  const { qrUuid } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserByQr(qrUuid)
      .then((res) => {
        navigate("/dashboard", { replace: true, state: { startChatWith: res.data.user } });
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "This QR link is invalid or expired.");
      });
  }, [qrUuid, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-brand-600 font-medium"
            >
              Go to Dashboard
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-400">Opening conversation...</p>
        )}
      </div>
    </div>
  );
}
