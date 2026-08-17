# InterviewAI — Resume-to-Interview Questions Generator

InterviewAI is a React/Vite + FastAPI + MongoDB application that analyzes a candidate resume, optionally matches a job description, generates grounded interview questions with Gemini, runs interview sessions, evaluates answers, and shows performance history.

## Project layout

- `frontend/` — current React/Vite application
- `backend/backend/` — current FastAPI application
- `backend/frontend/` — archived legacy Next.js implementation; not used by the current app

## Requirements

- Node.js 18+
- Python 3.11+
- MongoDB 6+ (local), Docker Desktop, or a MongoDB Atlas connection string
- Gemini API key for AI generation (the backend includes deterministic fallback parsing/question generation when Gemini is unavailable)

## Quick start on Windows

1. Copy `backend/backend/.env.example` to `backend/backend/.env` and set `MONGODB_URI` and `JWT_SECRET`. Add `GEMINI_API_KEY_1` for Gemini-backed generation. With Docker Desktop installed, `start.bat` will also start the bundled MongoDB container automatically.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Run `start.bat` from the project root.
4. Open http://localhost:3000

The helper script creates a Python virtual environment when needed, installs the backend requirements, installs frontend packages, and starts FastAPI on port 8000 and Vite on port 3000.

## Manual start

### Backend

```powershell
cd backend/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Main user flow

Landing → Register/Login → Onboarding → Upload Resume → Optional JD Upload/Role Preparation → Generate Questions → Start Interview → Submit Answers → Feedback/Follow-ups → Completion → Dashboard/Performance.

## Important

The application requires MongoDB for persistent user/resume/session data. The UI will still start without a running backend, but authenticated features require the FastAPI server and database.
