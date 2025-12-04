#!/usr/bin/env python3
"""
Wrapper script that runs Alembic migrations before starting the FastAPI backend.
This ensures the database schema is always up-to-date before the application starts.
"""

import subprocess
import sys
import os
from pathlib import Path

# Colors for terminal output
class Colors:
    CYAN = '\033[0;36m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    GRAY = '\033[0;90m'
    NC = '\033[0m'  # No Color

def log(message, color=Colors.NC):
    """Print colored log message"""
    print(f"{color}{message}{Colors.NC}")

def run_migrations():
    """Run Alembic migrations"""
    log("=== Starting PMS Backend with Migrations ===", Colors.CYAN)
    log(f"Backend directory: {Path.cwd()}", Colors.GRAY)
    print()

    log("Running database migrations...", Colors.YELLOW)

    try:
        # Run alembic upgrade head
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            check=True
        )

        log("✓ Migrations completed successfully", Colors.GREEN)
        if result.stdout:
            print(result.stdout)
        print()

        return True

    except subprocess.CalledProcessError as e:
        log("✗ Migration failed!", Colors.RED)
        print(e.stderr)
        print()
        log("Backend will not start due to migration failure.", Colors.YELLOW)
        return False

def start_uvicorn():
    """Start the Uvicorn server"""
    log("Starting uvicorn server...", Colors.YELLOW)

    # Import and run uvicorn programmatically
    try:
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )
    except ImportError:
        # Fallback to subprocess if uvicorn not in path
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "main:app",
            "--host", "0.0.0.0",
            "--port", "8000"
        ])

if __name__ == "__main__":
    # Ensure we're in the backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)

    # Run migrations
    if run_migrations():
        # Start the server
        start_uvicorn()
    else:
        # Exit with error if migrations failed
        sys.exit(1)
