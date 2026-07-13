"""
ChatFlow API entrypoint.
Wires together the database, routers, CORS, and static file serving.
"""
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import auth, users, chat

load_dotenv()

# Create tables if they don't already exist (use Alembic migrations in real prod)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ChatFlow API",
    description="Production-quality real-time chat application backend "
    "with JWT auth, WebSockets, and QR-code based chat initiation.",
    version="1.0.0",
)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chat.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "ChatFlow API"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
