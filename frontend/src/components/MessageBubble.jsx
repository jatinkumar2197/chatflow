import { useState } from "react";
import { formatTime } from "../utils/format";

export default function MessageBubble({ message, isOwn, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.message);

  const submitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.message) {
      onEdit(message.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group px-4`}>
      <div className={`max-w-[75%] sm:max-w-[60%] relative`}>
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isOwn
              ? "bg-brand-500 text-white rounded-br-sm"
              : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
          } ${message.is_deleted ? "italic opacity-60" : ""}`}
        >
          {editing ? (
            <div className="flex flex-col gap-1">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitEdit()}
                className="text-slate-800 rounded px-2 py-1 text-sm"
              />
              <div className="flex gap-2 text-xs">
                <button onClick={submitEdit} className="underline">Save</button>
                <button onClick={() => setEditing(false)} className="underline">Cancel</button>
              </div>
            </div>
          ) : (
            message.message
          )}
        </div>

        <div
          className={`flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          <span>{formatTime(message.created_at)}</span>
          {message.is_edited && !message.is_deleted && <span>(edited)</span>}
          {isOwn && !message.is_deleted && (
            <span>{message.is_read ? "✓✓ Read" : message.is_delivered ? "✓✓" : "✓"}</span>
          )}
        </div>

        {isOwn && !message.is_deleted && (
          <div className="absolute top-0 -left-7 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-6 h-6 rounded-full hover:bg-slate-200 text-slate-400 text-xs"
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="absolute z-10 -left-24 top-6 bg-white border border-slate-200 rounded-lg shadow-lg text-xs w-24 overflow-hidden">
                <button
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(message.id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-red-500"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
