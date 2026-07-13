import { API_BASE_URL } from "../services/api";
import { resolveAssetUrl, initials } from "../utils/format";

export default function OnlineUsersList({ users, onSelect }) {
  const online = users.filter((u) => u.is_online);
  if (online.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-slate-100">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
        Online now
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {online.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u)}
            className="flex flex-col items-center gap-1 shrink-0"
            title={u.username}
          >
            <div className="relative">
              {u.profile_image ? (
                <img
                  src={resolveAssetUrl(u.profile_image, API_BASE_URL)}
                  alt={u.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                  {initials(u.username)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
            </div>
            <span className="text-[10px] text-slate-500 max-w-[48px] truncate">{u.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
