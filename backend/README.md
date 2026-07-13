# ChatFlow Backend (FastAPI)

Real-time chat API with JWT authentication, WebSockets, MySQL, and
QR-code based user discovery.

## Setup

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # then edit DATABASE_URL / SECRET_KEY
```

Create the MySQL database (tables are auto-created on first run):

```sql
CREATE DATABASE chatflow CHARACTER SET utf8mb4;
```

Run the server:

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs
