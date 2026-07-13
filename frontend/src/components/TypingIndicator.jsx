export default function TypingIndicator({ username }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-slate-400">
      <span>{username} is typing</span>
      <span className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" />
      </span>
    </div>
  );
}
