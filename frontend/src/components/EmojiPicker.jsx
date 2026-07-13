import { useState, useRef, useEffect } from "react";
import Picker from "emoji-picker-react";

/**
 * Small popover-based emoji picker button. Wraps `emoji-picker-react`.
 */
export default function EmojiPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-xl"
        aria-label="Insert emoji"
      >
        🙂
      </button>
      {open && (
        <div className="absolute bottom-12 left-0 z-20 shadow-xl rounded-xl overflow-hidden">
          <Picker
            onEmojiClick={(emojiData) => {
              onSelect(emojiData.emoji);
              setOpen(false);
            }}
            height={350}
            width={300}
          />
        </div>
      )}
    </div>
  );
}
