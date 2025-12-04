#!/bin/bash
# Database Migration Script for PMS (Linux/Unix)
# This script can be run manually to apply database migrations

set -e  # Exit on error

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== PMS Database Migration Tool ===${NC}"
echo -e "${GRAY}Backend directory: $BACKEND_DIR${NC}"
echo ""

# Function to run alembic commands
run_alembic_command() {
    local command="$1"
    echo -e "${YELLOW}Running: python -m alembic $command${NC}"

    if python -m alembic $command; then
        return 0
    else
        return 1
    fi
}

# Parse command line arguments
case "${1:-upgrade}" in
    status)
        echo -e "${CYAN}Current Migration Status:${NC}"
        run_alembic_command "current"
        echo ""
        echo -e "${CYAN}Pending Migrations:${NC}"
        run_alembic_command "heads"
        ;;

    history)
        echo -e "${CYAN}Migration History:${NC}"
        run_alembic_command "history --verbose"
        ;;

    downgrade)
        echo -e "${YELLOW}WARNING: This will downgrade the database by one migration!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            run_alembic_command "downgrade -1"
        else
            echo -e "${GRAY}Downgrade cancelled.${NC}"
        fi
        ;;

    create)
        read -p "Enter migration message: " message
        if [ -n "$message" ]; then
            run_alembic_command "revision --autogenerate -m \"$message\""
            echo ""
            echo -e "${YELLOW}Migration file created. Please review it before applying.${NC}"
        else
            echo -e "${RED}Migration message is required.${NC}"
            exit 1
        fi
        ;;

    upgrade|*)
        echo -e "${CYAN}Applying all pending migrations...${NC}"
        echo ""

        # Check current status first
        echo -e "${GRAY}Current Status:${NC}"
        run_alembic_command "current"
        echo ""

        # Apply migrations
        if run_alembic_command "upgrade head"; then
            echo ""
            echo -e "${GREEN}✓ All migrations applied successfully!${NC}"
            echo ""
            echo -e "${GRAY}New Status:${NC}"
            run_alembic_command "current"
        else
            echo ""
            echo -e "${RED}✗ Migration failed!${NC}"
            echo -e "${YELLOW}Please check the error messages above and fix any issues.${NC}"
            exit 1
        fi
        ;;
esac
