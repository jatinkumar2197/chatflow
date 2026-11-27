
import os
import logging

from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .database import Base, engine
from .routers import auth, users, chat

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully")
    except Exception:
        logger.error("Database initialization failed")

    yield

    engine.dispose()


app = FastAPI(
    title="ChatFlow API",
    description="Real-time chat application backend",
    version="1.0.0",
    lifespan=lifespan
)

FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:5173"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = os.path.join(
    os.path.dirname(__file__), "static"
)

os.makedirs(static_dir, exist_ok=True)

app.mount(
    "/static",
    StaticFiles(directory=static_dir),
    name="static"
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chat.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "service": "ChatFlow API"
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}


@app.get("/health/db", tags=["Health"])
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected"
            }
        )
