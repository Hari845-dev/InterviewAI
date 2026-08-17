# InterviewAI Project Status

## Current application

The current application is:

- `frontend/` — React + Vite frontend
- `backend/backend/` — FastAPI backend
- MongoDB — persistent storage
- Gemini — AI generation when a Gemini API key is configured

`backend/frontend/` was an older Next.js implementation and is intentionally not part of the release.

## Main connected flow

Landing → Authentication → Onboarding → Resume Upload → Optional Job Description → Matching / Preparation → Gemini question generation → Interview Session → Answer Evaluation → Completion → Dashboard / Performance.

## API contract alignment

The frontend API layer normalizes backend schemas for questions, sessions, resumes, and aptitude data. Fake resume/session fallbacks are not used for production flows.

## Required local configuration

1. MongoDB must be running locally or `MONGODB_URI` must point to MongoDB Atlas.
2. `backend/backend/.env` must contain a unique local `JWT_SECRET`.
3. A Gemini API key should be supplied for Gemini-backed generation. Resume/JD parsing and question generation contain deterministic fallbacks when Gemini is unavailable.
4. `frontend/.env` should point `VITE_API_URL` to the FastAPI server.

## Run

On Windows, run `start.bat`. It creates/uses a local backend virtual environment, installs dependencies, starts FastAPI on port `8000`, starts Vite on port `3000`, and opens the site.

For manual startup, see the root `README.md`.
