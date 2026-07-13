import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { loginUser, registerUser, logoutUser, fetchProfile } from "../services/api";
import socketService from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("chatflow_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((token, userData) => {
    localStorage.setItem("chatflow_token", token);
    localStorage.setItem("chatflow_user", JSON.stringify(userData));
    setUser(userData);
    socketService.connect(token);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("chatflow_token");
    if (!token) {
      setLoading(false);
      return;
    }
    socketService.connect(token);
    fetchProfile()
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("chatflow_user", JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem("chatflow_token");
        localStorage.removeItem("chatflow_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    persistSession(res.data.access_token, res.data.user);
    return res.data.user;
  };

  const register = async (username, email, password) => {
    const res = await registerUser({ username, email, password });
    persistSession(res.data.access_token, res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // proceed with local logout regardless
    }
    socketService.disconnect();
    localStorage.removeItem("chatflow_token");
    localStorage.removeItem("chatflow_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
