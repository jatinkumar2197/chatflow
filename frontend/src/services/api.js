import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("chatflow_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401s
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("chatflow_token");
      localStorage.removeItem("chatflow_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ---------- Auth ----------
export const registerUser = (data) => api.post("/api/auth/register", data);
export const loginUser = (data) => api.post("/api/auth/login", data);
export const logoutUser = () => api.post("/api/auth/logout");

// ---------- Users ----------
export const fetchUsers = () => api.get("/api/users");
export const fetchProfile = () => api.get("/api/profile");
export const updateProfile = (data) => api.put("/api/profile", data);
export const uploadProfilePicture = (formData) =>
  api.post("/api/profile/picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// ---------- QR ----------
export const fetchMyQr = () => api.get("/api/my-qr");
export const regenerateQr = () => api.post("/api/generate-qr");
export const fetchUserByQr = (qrUuid) => api.get(`/api/user-by-qr/${qrUuid}`);
export const scanQr = (qrUuid) => api.post("/api/scan-qr", { qr_uuid: qrUuid });

// ---------- Chat ----------
export const fetchConversations = () => api.get("/api/conversations");
export const fetchMessages = (userId) => api.get(`/api/messages/${userId}`);
export const sendMessageRest = (data) => api.post("/api/message", data);
export const editMessageRest = (id, data) => api.put(`/api/message/${id}`, data);
export const deleteMessageRest = (id) => api.delete(`/api/message/${id}`);

export default api;
