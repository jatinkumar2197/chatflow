import { API_BASE_URL } from "../services/api";
import { resolveAssetUrl, initials, formatLastSeen } from "../utils/format";

export default function UserCard({ user, active, unreadCount = 0, lastMessage, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
        active ? "bg-brand-50 border border-brand-100" : "hover:bg-slate-50 border border-transparent"
      }`}
    >
      <div className="relative shrink-0">
        {user.profile_image ? (
          <img
            src={resolveAssetUrl(user.profile_image, API_BASE_URL)}
            alt={user.username}
            className="w-11 h-11 rounded-full object-cover"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
            {initials(user.username)}
          </div>
        )}
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            user.is_online ? "bg-green-500" : "bg-slate-300"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm text-slate-800 truncate">{user.username}</p>
          {unreadCount > 0 && (
            <span className="ml-2 text-[10px] font-bold bg-brand-500 text-white rounded-full px-1.5 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 truncate">
          {lastMessage
            ? lastMessage.message
            : user.is_online
            ? "Online"
            : `Last seen ${formatLastSeen(user.last_seen)}`}
        </p>
      </div>
    </button>
  );
}
