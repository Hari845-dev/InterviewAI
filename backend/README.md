# InterviewAI FastAPI Backend

This is the current FastAPI backend used by the root `frontend/` React/Vite application.

## Stack

- FastAPI
- MongoDB / Motor
- Pydantic
- JWT authentication
- Google Gemini

## Setup

From `backend/backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Configure `MONGODB_URI`, `JWT_SECRET`, and `CORS_ORIGINS` in `.env`. Add a Gemini API key for AI generation.

## Seed the aptitude/question banks

```powershell
python scripts/seed.py
```

## Tests

```powershell
pytest tests/ -v
```

The current frontend connects to this backend at `http://localhost:8000` by default.
