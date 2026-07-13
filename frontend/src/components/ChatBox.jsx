import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { fetchMessages, editMessageRest, deleteMessageRest } from "../services/api";
import socketService from "../services/socket";
import MessageBubble from "./MessageBubble.jsx";
import TypingIndicator from "./TypingIndicator.jsx";
import EmojiPicker from "./EmojiPicker.jsx";
import { API_BASE_URL } from "../services/api";
import { resolveAssetUrl, initials, formatLastSeen } from "../utils/format";

let typingTimeout;

export default function ChatBox({ partner }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!partner) return;
    setLoading(true);
    fetchMessages(partner.id)
      .then((res) => setMessages(res.data))
      .finally(() => setLoading(false));
    socketService.sendRead(partner.id);
  }, [partner]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  const handleEvent = useCallback(
    (payload) => {
      if (!partner) return;

      if (payload.type === "message") {
        const m = payload.data;
        const isForThisThread =
          (m.sender_id === partner.id && m.receiver_id === user.id) ||
          (m.sender_id === user.id && m.receiver_id === partner.id);
        if (isForThisThread) {
          setMessages((prev) => [...prev, m]);
          if (m.sender_id === partner.id) {
            socketService.sendRead(partner.id);
          }
        }
      } else if (payload.type === "typing" && payload.sender_id === partner.id) {
        setPartnerTyping(payload.is_typing);
        clearTimeout(typingTimeout);
        if (payload.is_typing) {
          typingTimeout = setTimeout(() => setPartnerTyping(false), 3000);
        }
      } else if (payload.type === "read_receipt" && payload.reader_id === partner.id) {
        setMessages((prev) =>
          prev.map((m) => (m.receiver_id === partner.id ? { ...m, is_read: true } : m))
        );
      } else if (payload.type === "message_edited") {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.data.id ? payload.data : m))
        );
      } else if (payload.type === "message_deleted") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.data.id ? { ...m, is_deleted: true, message: "This message was deleted" } : m
          )
        );
      }
    },
    [partner, user]
  );

  useSocket(handleEvent);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !partner) return;
    socketService.sendMessage(partner.id, text);
    setDraft("");
    socketService.sendTyping(partner.id, false);
  };

  const handleTyping = (value) => {
    setDraft(value);
    if (!partner) return;
    socketService.sendTyping(partner.id, value.length > 0);
  };

  const handleEdit = async (id, newText) => {
    await editMessageRest(id, { message: newText });
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, message: newText, is_edited: true } : m)));
  };

  const handleDelete = async (id) => {
    await deleteMessageRest(id);
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_deleted: true, message: "This message was deleted" } : m))
    );
  };

  if (!partner) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-200 bg-white shrink-0">
        {partner.profile_image ? (
          <img
            src={resolveAssetUrl(partner.profile_image, API_BASE_URL)}
            alt={partner.username}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
            {initials(partner.username)}
          </div>
        )}
        <div>
          <p className="font-medium text-sm text-slate-800">{partner.username}</p>
          <p className="text-xs text-slate-400">
            {partner.is_online ? "Online" : `Last seen ${formatLastSeen(partner.last_seen)}`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-2">
        {loading ? (
          <p className="text-center text-sm text-slate-400">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Say hello 👋 to start the conversation</p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_id === user.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
        {partnerTyping && <TypingIndicator username={partner.username} />}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
        <EmojiPicker onSelect={(emoji) => setDraft((d) => d + emoji)} />
        <input
          value={draft}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-full bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="px-4 py-2.5 rounded-full bg-brand-500 text-white text-sm font-medium disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
