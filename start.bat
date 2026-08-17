@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo InterviewAI - Local Development Starter
echo ========================================

where docker >nul 2>nul
if not errorlevel 1 (
  echo Starting MongoDB with Docker...
  docker compose up -d mongodb
) else (
  echo Docker not found. The backend will use the MongoDB URI configured in backend\backend\.env.
)

if not exist "backend\backend\.env" (
  copy /Y "backend\backend\.env.example" "backend\backend\.env" >nul
  echo Created backend .env from .env.example
  echo Please edit backend\backend\.env and configure MongoDB and JWT_SECRET before first real login.
)

if not exist "frontend\.env" (
  copy /Y "frontend\.env.example" "frontend\.env" >nul
  echo Created frontend .env from .env.example
)

if not exist "backend\.venv\Scripts\python.exe" (
  echo Creating backend virtual environment...
  py -3 -m venv backend\.venv
  if errorlevel 1 (
    python -m venv backend\.venv
  )
)

echo Installing backend dependencies...
backend\.venv\Scripts\python.exe -m pip install -r backend\backend\requirements.txt
if errorlevel 1 goto backend_install_failed

echo Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 goto frontend_install_failed
cd ..

echo Starting FastAPI...
start "InterviewAI Backend" cmd /k "cd /d %~dp0backend\backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Starting Vite frontend...
start "InterviewAI Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

ping 127.0.0.1 -n 3 >nul
start http://localhost:3000
exit /b 0

:backend_install_failed
echo.
echo Backend dependency installation failed. Check Python and network access.
pause
exit /b 1

:frontend_install_failed
echo.
echo Frontend dependency installation failed. Check Node.js and npm.
pause
exit /b 1
