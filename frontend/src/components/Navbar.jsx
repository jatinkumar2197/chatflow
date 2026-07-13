import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { API_BASE_URL } from "../services/api";
import { resolveAssetUrl, initials } from "../utils/format";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-slate-200 bg-white shrink-0">
      <Link to="/dashboard" className="font-bold text-brand-600 text-lg tracking-tight">
        ChatFlow
      </Link>

      {user && (
        <div className="flex items-center gap-3">
          <Link to="/scan" className="text-sm text-slate-500 hover:text-brand-600" title="Scan QR">
            Scan QR
          </Link>
          <Link to="/profile" className="flex items-center gap-2 group">
            {user.profile_image ? (
              <img
                src={resolveAssetUrl(user.profile_image, API_BASE_URL)}
                alt={user.username}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                {initials(user.username)}
              </div>
            )}
            <span className="text-sm text-slate-700 group-hover:text-brand-600 hidden sm:inline">
              {user.username}
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
