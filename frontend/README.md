# InterviewAI Frontend

Current production frontend for InterviewAI. It is built with React, Vite, React Router, and Tailwind CSS utilities.

## Setup

```powershell
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:3000.

The frontend reads `VITE_API_URL` from `.env` and defaults to `http://localhost:8000`.

The frontend no longer depends on a mock-data runtime path. It uses the FastAPI API and normalizes backend responses in `src/api/`.
