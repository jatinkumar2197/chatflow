const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

/**
 * Thin wrapper around the native WebSocket API for the /api/ws/{token}
 * endpoint. Supports auto-reconnect and a simple pub/sub listener model.
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
    this.reconnectTimer = null;
    this.token = null;
  }

  connect(token) {
    this.token = token;
    this._open();
  }

  _open() {
    if (!this.token) return;
    this.socket = new WebSocket(`${WS_BASE_URL}/api/ws/${this.token}`);

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.listeners.forEach((cb) => cb(payload));
      } catch {
        // ignore malformed frames
      }
    };

    this.socket.onclose = () => {
      // simple auto-reconnect after 2s if we still have a token
      if (this.token) {
        this.reconnectTimer = setTimeout(() => this._open(), 2000);
      }
    };
  }

  disconnect() {
    this.token = null;
    clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
  }

  send(payload) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  sendMessage(receiverId, message, messageType = "text") {
    this.send({ type: "message", receiver_id: receiverId, message, message_type: messageType });
  }

  sendTyping(receiverId, isTyping) {
    this.send({ type: "typing", receiver_id: receiverId, is_typing: isTyping });
  }

  sendRead(senderId) {
    this.send({ type: "read", sender_id: senderId });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

const socketService = new SocketService();
export default socketService;
