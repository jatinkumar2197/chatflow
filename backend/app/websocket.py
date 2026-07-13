"""
WebSocket connection manager.
Tracks active connections per user and handles broadcasting of
messages, typing indicators, read receipts, and presence events.
"""
import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # A user can have multiple active connections (multiple tabs/devices)
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        connections = self.active_connections.get(user_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections and user_id in self.active_connections:
            del self.active_connections[user_id]

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    async def send_to_user(self, user_id: int, payload: dict):
        """Send a JSON payload to every active connection of a specific user."""
        for ws in list(self.active_connections.get(user_id, [])):
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast_presence(self, user_id: int, is_online: bool):
        """Notify all connected users of a presence change."""
        payload = {"type": "presence", "user_id": user_id, "is_online": is_online}
        for uid in list(self.active_connections.keys()):
            await self.send_to_user(uid, payload)


manager = ConnectionManager()
