import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ChatBox from "../components/ChatBox.jsx";
import { fetchUsers, fetchConversations } from "../services/api";
import { useSocket } from "../hooks/useSocket";

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const loadData = useCallback(() => {
    fetchUsers().then((res) => setUsers(res.data));
    fetchConversations().then((res) => setConversations(res.data));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // If we arrived here via a QR deep-link (state.startChatWith), open that conversation
  useEffect(() => {
    if (location.state?.startChatWith) {
      setActivePartner(location.state.startChatWith);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Keep presence + conversation list fresh in real time
  useSocket(
    useCallback(
      (payload) => {
        if (payload.type === "presence") {
          setUsers((prev) =>
            prev.map((u) => (u.id === payload.user_id ? { ...u, is_online: payload.is_online } : u))
          );
          setActivePartner((prev) =>
            prev && prev.id === payload.user_id ? { ...prev, is_online: payload.is_online } : prev
          );
        }
        if (payload.type === "message") {
          fetchConversations().then((res) => setConversations(res.data));
        }
      },
      []
    )
  );

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <div className={`${activePartner ? "hidden sm:flex" : "flex"} w-full sm:w-auto`}>
          <Sidebar
            users={users}
            conversations={conversations}
            activeUserId={activePartner?.id}
            onSelectUser={setActivePartner}
          />
        </div>
        <div className={`${activePartner ? "flex" : "hidden sm:flex"} flex-1`}>
          <ChatBox partner={activePartner} />
        </div>
      </div>
    </div>
  );
}
