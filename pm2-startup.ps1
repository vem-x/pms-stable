#!/usr/bin/env pwsh
# PM2 Startup Script - Universal (works on any machine)
# Runs migrations and starts both backend and frontend with PM2

$ErrorActionPreference = "Stop"

# Wait for system to fully boot
Start-Sleep -Seconds 20

# Get the script's directory (project root)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = $scriptPath

Write-Host "=== PM2 Startup Script ===" -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Gray

# Dynamically set PATH
$currentUser = $env:USERNAME
$npmPath = "C:\Users\$currentUser\AppData\Roaming\npm"
$pythonPath = (Get-ChildItem "C:\Program Files\Python*\python.exe","C:\Users\*\AppData\Local\Programs\Python\Python*\python.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty DirectoryName)

# Build PATH
$paths = @($npmPath, $pythonPath, "$pythonPath\Scripts")
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
foreach ($p in $paths) {
    if ($p -and ($env:Path -notlike "*$p*")) {
        $env:Path += ";$p"
    }
}

# Log file in project root
$logFile = Join-Path $projectRoot "pm2-startup.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    # Navigate to backend directory
    $backendPath = Join-Path $projectRoot "backend"
    Set-Location $backendPath
    Add-Content -Path $logFile -Value "$timestamp - Starting database migration process..."
    Write-Host "Running database migrations..." -ForegroundColor Yellow

    # Run Alembic migrations
    $migrationOutput = python -m alembic upgrade head 2>&1
    $migrationExitCode = $LASTEXITCODE

    if ($migrationExitCode -eq 0) {
        Add-Content -Path $logFile -Value "$timestamp - Database migrations completed successfully"
        Add-Content -Path $logFile -Value "$timestamp - Migration output: $migrationOutput"
        Write-Host "✓ Migrations completed successfully" -ForegroundColor Green
    } else {
        Add-Content -Path $logFile -Value "$timestamp - ERROR: Database migration failed with exit code $migrationExitCode"
        Add-Content -Path $logFile -Value "$timestamp - Migration error output: $migrationOutput"
        Write-Host "✗ Migration failed!" -ForegroundColor Red
        throw "Database migration failed. Backend startup aborted."
    }

    # Start backend from ecosystem file (only if migrations succeeded)
    Write-Host "Starting backend with PM2..." -ForegroundColor Yellow
    pm2 start ecosystem.config.js
    Add-Content -Path $logFile -Value "$timestamp - Backend started from ecosystem.config.js"
    Write-Host "✓ Backend started" -ForegroundColor Green

    # Start frontend from ecosystem file
    $frontendPath = Join-Path $projectRoot "frontend"
    Set-Location $frontendPath
    Write-Host "Starting frontend with PM2..." -ForegroundColor Yellow
    pm2 start ecosystem.config.js
    Add-Content -Path $logFile -Value "$timestamp - Frontend started from ecosystem.config.js"
    Write-Host "✓ Frontend started" -ForegroundColor Green

    # Save PM2 state
    pm2 save --force
    Add-Content -Path $logFile -Value "$timestamp - PM2 state saved"
    Write-Host "✓ PM2 state saved" -ForegroundColor Green

    Write-Host ""
    Write-Host "=== Startup Complete ===" -ForegroundColor Cyan
    pm2 list

} catch {
    Add-Content -Path $logFile -Value "$timestamp - ERROR: $_"
    Write-Host "✗ ERROR: $_" -ForegroundColor Red
    exit 1
}
