$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (!(Test-Path 'backend/backend/.env')) {
  Copy-Item 'backend/backend/.env.example' 'backend/backend/.env'
  Write-Host 'Created backend/backend/.env. Configure MongoDB and JWT_SECRET before using authenticated features.' -ForegroundColor Yellow
}
if (!(Test-Path 'frontend/.env')) {
  Copy-Item 'frontend/.env.example' 'frontend/.env'
}

if (!(Test-Path 'backend/.venv/Scripts/python.exe')) {
  py -3 -m venv backend/.venv
}
& 'backend/.venv/Scripts/python.exe' -m pip install -r 'backend/backend/requirements.txt'
Push-Location frontend
npm install
Pop-Location

Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$PSScriptRoot/backend/backend'; & '../.venv/Scripts/python.exe' -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$PSScriptRoot/frontend'; npm run dev"
Start-Sleep -Seconds 2
Start-Process 'http://localhost:3000'
