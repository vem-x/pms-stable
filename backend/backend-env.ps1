cd C:\Users\vem\pms-stable\backend

# Create environment file: backend-env.ps1
@"
`$env:ENVIRONMENT='production'
`$env:DATABASE_URL='postgresql://pms_user:pms_password@160.226.0.67:5432/pms_db'
`$env:JWT_SECRET_KEY='your-secret-key'
uvicorn main:app --host 0.0.0.0 --port 8000
"@ | Out-File -FilePath run-backend.ps1

# Install as Windows service
nssm install PMSBackend powershell.exe
nssm set PMSBackend AppParameters "-ExecutionPolicy Bypass -File C:\Users\vem\pms-stable\backend\run-backend.ps1"
nssm set PMSBackend AppDirectory C:\Users\vem\pms-stable\backend
nssm set PMSBackend DisplayName "PMS Backend Service"
nssm set PMSBackend Description "PMS FastAPI Backend"
nssm set PMSBackend Start SERVICE_AUTO_START

# Start the service
nssm start PMSBackend