# Database Migrations Quick Reference

## Quick Commands

### Check Status
```bash
# Windows
cd backend && .\run-migrations.ps1 -Status

# Linux
cd backend && ./run-migrations.sh status
```

### Apply All Pending Migrations
```bash
# Windows
cd backend && .\run-migrations.ps1

# Linux
cd backend && ./run-migrations.sh
```

### Create New Migration (After Model Changes)
```bash
# Windows
cd backend && .\run-migrations.ps1 -Create

# Linux
cd backend && ./run-migrations.sh create
```

### View History
```bash
# Windows
cd backend && .\run-migrations.ps1 -History

# Linux
cd backend && ./run-migrations.sh history
```

### Manual Alembic Commands
```bash
cd backend

# Current version
python -m alembic current

# Upgrade to latest
python -m alembic upgrade head

# Downgrade one step
python -m alembic downgrade -1

# Show pending migrations
python -m alembic history -r current:head

# Create migration manually
python -m alembic revision --autogenerate -m "description"
```

## Deployment Flow

1. Pull code: `git pull origin main`
2. Migrations run automatically when PM2 restarts
3. If manual run needed: `./run-migrations.sh` (or `.ps1` on Windows)

## Troubleshooting One-Liners

```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# View migration table
psql $DATABASE_URL -c "SELECT * FROM alembic_version"

# Check PM2 logs
pm2 logs pms-backend --lines 50

# Check startup logs (Linux)
tail -f /path/to/pms-stable/pm2-startup.log

# Check startup logs (Windows)
Get-Content C:\Users\vem\pms-stable\pm2-startup.log -Tail 50

# Restart with fresh migrations
pm2 restart pms-backend
```

## What's Automated

✅ Migrations run automatically before backend starts
✅ Backend won't start if migrations fail (safety)
✅ All migration activity is logged
✅ Works on both Windows and Linux servers
