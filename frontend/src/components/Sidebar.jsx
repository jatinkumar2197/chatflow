import { useMemo, useState } from "react";
import UserCard from "./UserCard.jsx";
import OnlineUsersList from "./OnlineUsersList.jsx";

export default function Sidebar({ users, conversations, activeUserId, onSelectUser }) {
  const [search, setSearch] = useState("");

  const conversationMap = useMemo(() => {
    const map = new Map();
    conversations.forEach((c) => map.set(c.user.id, c));
    return map;
  }, [conversations]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.username.toLowerCase().includes(q));
  }, [users, search]);

  // Show users with existing conversations first (sorted by recency via conversations order),
  // then the rest alphabetically.
  const sortedUsers = useMemo(() => {
    const withConvo = [];
    const withoutConvo = [];
    filteredUsers.forEach((u) => {
      if (conversationMap.has(u.id)) withConvo.push(u);
      else withoutConvo.push(u);
    });
    withConvo.sort(
      (a, b) => conversations.findIndex((c) => c.user.id === a.id) -
        conversations.findIndex((c) => c.user.id === b.id)
    );
    return [...withConvo, ...withoutConvo];
  }, [filteredUsers, conversationMap, conversations]);

  return (
    <aside className="w-full sm:w-80 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full px-3 py-2 rounded-lg bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      <OnlineUsersList users={users} onSelect={onSelectUser} />

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {sortedUsers.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-8">No users found</p>
        )}
        {sortedUsers.map((u) => {
          const convo = conversationMap.get(u.id);
          return (
            <UserCard
              key={u.id}
              user={u}
              active={activeUserId === u.id}
              unreadCount={convo?.unread_count || 0}
              lastMessage={convo?.last_message}
              onClick={() => onSelectUser(u)}
            />
          );
        })}
      </div>
    </aside>
  );
}
