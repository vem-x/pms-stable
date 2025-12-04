#!/bin/bash
# PM2 Startup Script for PMS (Linux/Unix)
# This script runs migrations and starts the PMS application with PM2

set -e  # Exit on error

# Configuration
APP_DIR="/path/to/pms-stable"  # UPDATE THIS PATH for your server
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_FILE="$APP_DIR/pm2-startup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to log messages
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$timestamp] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$timestamp] SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

# Wait for system to fully boot (if running at startup)
sleep 5

log "========================================="
log "Starting PMS Application with PM2"
log "========================================="

# Navigate to backend directory
cd "$BACKEND_DIR"
log "Changed to backend directory: $BACKEND_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    log "Activating Python virtual environment..."
    source venv/bin/activate
elif [ -d "env" ]; then
    log "Activating Python virtual environment..."
    source env/bin/activate
else
    log "No virtual environment found, using system Python"
fi

# Run database migrations
log "Starting database migration process..."
migration_output=$(python -m alembic upgrade head 2>&1)
migration_exit_code=$?

if [ $migration_exit_code -eq 0 ]; then
    log_success "Database migrations completed successfully"
    log "Migration output: $migration_output"
else
    log_error "Database migration failed with exit code $migration_exit_code"
    log_error "Migration error output: $migration_output"
    log_error "Backend startup aborted due to migration failure"
    exit 1
fi

# Start backend with PM2
log "Starting backend with PM2..."
if pm2 start ecosystem.config.js; then
    log_success "Backend started from ecosystem.config.js"
else
    log_error "Failed to start backend"
    exit 1
fi

# Navigate to frontend directory
cd "$FRONTEND_DIR"
log "Changed to frontend directory: $FRONTEND_DIR"

# Start frontend with PM2
log "Starting frontend with PM2..."
if pm2 start ecosystem.config.js; then
    log_success "Frontend started from ecosystem.config.js"
else
    log_error "Failed to start frontend"
    exit 1
fi

# Save PM2 state
log "Saving PM2 state..."
if pm2 save --force; then
    log_success "PM2 state saved"
else
    log_error "Failed to save PM2 state"
fi

log "========================================="
log "PMS Application startup complete!"
log "========================================="

# Show PM2 status
pm2 status
