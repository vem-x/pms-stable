# Database Migration Script for PMS
# This script can be run manually to apply database migrations

param(
    [switch]$Status,      # Show current migration status
    [switch]$History,     # Show migration history
    [switch]$Upgrade,     # Apply all pending migrations (default)
    [switch]$Downgrade,   # Downgrade one migration
    [switch]$Create       # Create a new migration
)

$ErrorActionPreference = "Stop"
$backendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $backendPath

Write-Host "=== PMS Database Migration Tool ===" -ForegroundColor Cyan
Write-Host "Backend directory: $backendPath" -ForegroundColor Gray
Write-Host ""

# Function to run alembic commands
function Run-AlembicCommand {
    param([string]$command)

    Write-Host "Running: python -m alembic $command" -ForegroundColor Yellow
    $output = python -m alembic $command 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host $output -ForegroundColor Green
        return $true
    } else {
        Write-Host $output -ForegroundColor Red
        return $false
    }
}

# Show current migration status
if ($Status) {
    Write-Host "Current Migration Status:" -ForegroundColor Cyan
    Run-AlembicCommand "current"
    Write-Host ""
    Write-Host "Pending Migrations:" -ForegroundColor Cyan
    Run-AlembicCommand "heads"
    exit 0
}

# Show migration history
if ($History) {
    Write-Host "Migration History:" -ForegroundColor Cyan
    Run-AlembicCommand "history --verbose"
    exit 0
}

# Downgrade one migration
if ($Downgrade) {
    Write-Host "WARNING: This will downgrade the database by one migration!" -ForegroundColor Yellow
    $confirm = Read-Host "Are you sure? (yes/no)"
    if ($confirm -eq "yes") {
        Run-AlembicCommand "downgrade -1"
    } else {
        Write-Host "Downgrade cancelled." -ForegroundColor Gray
    }
    exit 0
}

# Create new migration
if ($Create) {
    $message = Read-Host "Enter migration message"
    if ($message) {
        Run-AlembicCommand "revision --autogenerate -m `"$message`""
        Write-Host ""
        Write-Host "Migration file created. Please review it before applying." -ForegroundColor Yellow
    } else {
        Write-Host "Migration message is required." -ForegroundColor Red
    }
    exit 0
}

# Default action: Upgrade to head (apply all pending migrations)
Write-Host "Applying all pending migrations..." -ForegroundColor Cyan
Write-Host ""

# Check current status first
Write-Host "Current Status:" -ForegroundColor Gray
Run-AlembicCommand "current"
Write-Host ""

# Apply migrations
$success = Run-AlembicCommand "upgrade head"
Write-Host ""

if ($success) {
    Write-Host "✓ All migrations applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "New Status:" -ForegroundColor Gray
    Run-AlembicCommand "current"
} else {
    Write-Host "✗ Migration failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above and fix any issues." -ForegroundColor Yellow
    exit 1
}
