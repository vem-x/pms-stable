# Wait for system to fully boot
Start-Sleep -Seconds 10

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Change to PM2 home directory
$pm2Home = "$env:USERPROFILE\.pm2"
if (Test-Path $pm2Home) {
    # Resurrect saved PM2 processes
    pm2 resurrect
    
    # Log the startup
    $logFile = "C:\Users\vem\pms-stable\pm2-startup.log"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "$timestamp - PM2 processes started"
} else {
    Write-Host "PM2 home directory not found"
}