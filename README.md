# ChatFlow 💬

A production-quality real-time chat application with JWT authentication,
WebSocket-powered messaging, and a **QR-code based instant chat-initiation
system** (scan a friend's QR code — like a digital business card — and
start chatting immediately).

**Tech stack:** FastAPI · React (Vite) · MySQL · SQLAlchemy · WebSockets · JWT · Tailwind CSS

---

## Features

**Authentication**
- Register / Login with JWT
- bcrypt password hashing
- Protected routes & token verification
- Logout (marks user offline)

**User**
- Edit profile (username, email)
- Upload profile picture
- Online/offline presence, last-seen timestamps

**Chat**
- Real-time one-to-one messaging over WebSockets
- Typing indicators, delivered/read receipts
- Emoji picker, auto-scroll, timestamps
- Edit / delete messages
- Unread message counts, conversation search

**QR Code Chat Initiation (signature feature)**
- Every user automatically gets a personal QR code on registration
- QR encodes only an opaque UUID deep link — never credentials
- In-app camera scanner (desktop webcam + mobile camera) via `html5-qrcode`
- Scanning resolves the user server-side, blocks self-chats, and opens or
  creates the conversation
- Download QR as PNG, copy shareable link, "Recently Scanned" history,
  deep-link support (`/chat/{uuid}`) that opens the right conversation
  after login

---

## Folder Structure

```
chatflow/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, static mount
│   │   ├── database.py        # SQLAlchemy engine/session
│   │   ├── models.py          # User, Message ORM models
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── auth.py            # bcrypt hashing + JWT
│   │   ├── dependencies.py    # get_current_user
│   │   ├── crud.py            # DB query functions
│   │   ├── utils.py           # QR generation, file uploads
│   │   ├── websocket.py       # ConnectionManager
│   │   ├── static/            # generated QR codes & profile pics
│   │   └── routers/
│   │       ├── auth.py        # /api/auth/*
│   │       ├── users.py       # /api/users, /api/profile, QR endpoints
│   │       └── chat.py        # /api/messages, /api/ws/{token}
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
└── frontend/
    ├── src/
    │   ├── pages/              # Login, Register, Dashboard, Profile, ScanQR, ChatDeepLink
    │   ├── components/         # Sidebar, ChatBox, MessageBubble, UserCard, Navbar, EmojiPicker, QrCard...
    │   ├── context/AuthContext.jsx
    │   ├── hooks/               # useAuth, useSocket
    │   ├── services/            # api.js (axios), socket.js (WebSocket client)
    │   └── utils/format.js
    ├── package.json
    └── vite.config.js
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account, auto-generates QR, returns JWT |
| POST | `/api/auth/login` | Authenticate, returns JWT |
| POST | `/api/auth/logout` | Mark user offline |
| GET | `/api/users` | List all users with live presence |
| GET/PUT | `/api/profile` | Get / update current user |
| POST | `/api/profile/picture` | Upload profile picture |
| GET | `/api/conversations` | Sidebar: partners, last message, unread count |
| GET | `/api/messages/{user_id}` | Conversation history (marks read) |
| POST | `/api/message` | Send message (REST fallback) |
| PUT | `/api/message/{id}` | Edit own message |
| DELETE | `/api/message/{id}` | Soft-delete own message |
| GET | `/api/my-qr` | Current user's QR image + deep link |
| POST | `/api/generate-qr` | Regenerate QR image |
| GET | `/api/user-by-qr/{uuid}` | Resolve a QR UUID to a public profile |
| POST | `/api/scan-qr` | Validate a scanned QR and check for existing conversation |
| WS | `/api/ws/{token}` | Real-time channel: `message`, `typing`, `read` events |

Full interactive docs (Swagger): `http://localhost:8000/docs`

---

## Local Setup

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # edit DATABASE_URL and SECRET_KEY
```
Create the database:
```sql
CREATE DATABASE chatflow CHARACTER SET utf8mb4;
```
Run it:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env        # points at http://localhost:8000 by default
npm run dev
```
Visit `http://localhost:5173`.

---

## Deployment

**Backend → Render**
1. Push `backend/` to GitHub.
2. New Web Service on Render, root directory `backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example` (`DATABASE_URL` pointing at your MySQL instance, a strong `SECRET_KEY`, `FRONTEND_ORIGIN` set to your Vercel URL, `APP_BASE_URL` set to your Render URL).

**MySQL → Railway**
1. New MySQL instance on Railway.
2. Copy the connection string into Render's `DATABASE_URL` as
   `mysql+pymysql://user:password@host:port/railway`.

**Frontend → Vercel**
1. Import the repo, root directory `frontend`.
2. Framework preset: Vite.
3. Environment variables: `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` (use `wss://` for the deployed backend) pointing at your Render URL.

---

## Security Notes
- Passwords are hashed with bcrypt and never stored or logged in plaintext.
- JWTs are required on all protected REST routes and the WebSocket handshake.
- QR codes encode only an opaque UUID — scanning one cannot leak an email,
  password, or any other credential.
- All scanned QR data is re-validated server-side (`/api/scan-qr`) before a
  chat is opened; self-chat is explicitly blocked.
- CORS is restricted to the configured frontend origin.

---

## Resume Bullet Points (ATS-friendly)

- Engineered a full-stack real-time chat application using FastAPI, React, and MySQL, implementing JWT authentication, bcrypt password hashing, and WebSocket-based one-to-one messaging with typing indicators and read receipts.
- Designed a normalized relational schema (SQLAlchemy ORM) for users and messages, supporting message editing, soft-deletion, and unread-count aggregation across conversations.
- Developed a QR code-based user discovery system enabling instant one-to-one chat initiation, encoding only opaque UUID identifiers to protect user privacy.
- Integrated real-time QR code generation and camera-based scanning (html5-qrcode) for seamless cross-platform user connections on desktop and mobile.
- Implemented secure server-side QR validation to prevent self-chat and unauthorized access, with deep-link support for one-tap conversation start.
- Built a responsive React (Vite + Tailwind) frontend with Context API state management, protected routing, and a custom WebSocket client with auto-reconnect.
- Deployed a production environment across Render (API), Vercel (frontend), and Railway (MySQL), with environment-based configuration and CORS hardening.

---

## Future Enhancements
- Group chat / channels
- Message reactions and threaded replies
- Push notifications (web + mobile)
- End-to-end encryption
- Voice/video calling via WebRTC
- Redis-backed pub/sub for horizontal WebSocket scaling
