# Wait for system to fully boot
Start-Sleep -Seconds 20

# Permanently set PATH (in case it's lost)
$npmPath = "C:\Users\vem\AppData\Roaming\npm"
$pythonPath = (Get-ChildItem "C:\Program Files\Python*\python.exe","C:\Users\*\AppData\Local\Programs\Python\Python*\python.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty DirectoryName)

# Build PATH
$paths = @($npmPath, $pythonPath, "$pythonPath\Scripts")
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
foreach ($p in $paths) {
    if ($p -and ($env:Path -notlike "*$p*")) {
        $env:Path += ";$p"
    }
}

# Log file
$logFile = "C:\Users\vem\pms-stable\pm2-startup.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    # Start backend directly from ecosystem file
    Set-Location C:\Users\vem\pms-stable\backend
    pm2 start ecosystem.config.js
    Add-Content -Path $logFile -Value "$timestamp - Backend started from ecosystem.config.js"
    
    # Start frontend directly from ecosystem file
    Set-Location C:\Users\vem\pms-stable\frontend
    pm2 start ecosystem.config.js
    Add-Content -Path $logFile -Value "$timestamp - Frontend started from ecosystem.config.js"
    
    # Save PM2 state for good measure
    pm2 save --force
    Add-Content -Path $logFile -Value "$timestamp - PM2 state saved"
    
} catch {
    Add-Content -Path $logFile -Value "$timestamp - ERROR: $_"
}