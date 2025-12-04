# PMS Deployment Guide with Automatic Database Migrations

This guide explains how to deploy the PMS application with automatic database migrations on both Windows and Linux servers.

## Overview

The PMS application now includes automatic database migration support through Alembic. Migrations run automatically before the application starts, ensuring your database schema is always up-to-date.

## Files

### Windows (PowerShell)
- `pm2-startup.ps1` - Main startup script with automatic migrations
- `backend/run-migrations.ps1` - Standalone migration management tool

### Linux/Unix (Bash)
- `pm2-startup.sh` - Main startup script with automatic migrations
- `backend/run-migrations.sh` - Standalone migration management tool

---

## Windows Server Setup

### Prerequisites
1. Python installed and in PATH
2. PM2 installed globally (`npm install -g pm2`)
3. PostgreSQL database running
4. Application pulled to `C:\Users\vem\pms-stable\` (or update paths in scripts)

### Configuration

1. **Update ecosystem.config.js** (if not already done)
   - Set correct `DATABASE_URL`
   - Configure other environment variables

2. **Test migrations manually first:**
   ```powershell
   cd C:\Users\vem\pms-stable\backend
   python -m alembic current
   python -m alembic upgrade head
   ```

3. **Configure automatic startup:**
   ```powershell
   # Run the startup script manually first to test
   .\pm2-startup.ps1

   # Set up Windows Task Scheduler for automatic startup on boot
   # Create a new task that runs:
   # Program: powershell.exe
   # Arguments: -ExecutionPolicy Bypass -File "C:\Users\vem\pms-stable\pm2-startup.ps1"
   # Trigger: At system startup
   # Run with highest privileges
   ```

### Manual Migration Management (Windows)

```powershell
cd backend

# Check current migration status
.\run-migrations.ps1 -Status

# View migration history
.\run-migrations.ps1 -History

# Apply all pending migrations (default)
.\run-migrations.ps1
.\run-migrations.ps1 -Upgrade

# Create a new migration
.\run-migrations.ps1 -Create

# Downgrade one migration (careful!)
.\run-migrations.ps1 -Downgrade
```

---

## Linux/Unix Server Setup

### Prerequisites
1. Python 3.8+ installed
2. PM2 installed globally (`npm install -g pm2`)
3. PostgreSQL database running
4. Application pulled to server

### Configuration

1. **Update paths in pm2-startup.sh:**
   ```bash
   # Edit the script and update this line:
   APP_DIR="/path/to/pms-stable"  # Change to your actual path
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x pm2-startup.sh
   chmod +x backend/run-migrations.sh
   ```

3. **Test migrations manually first:**
   ```bash
   cd backend
   ./run-migrations.sh status
   ./run-migrations.sh upgrade
   ```

4. **Configure automatic startup:**

   **Option A: Using PM2 startup (Recommended)**
   ```bash
   # Run once to test
   ./pm2-startup.sh

   # Set up PM2 to run on boot
   pm2 startup
   # Follow the instructions shown (usually requires running a command with sudo)

   # Save the current PM2 process list
   pm2 save
   ```

   **Option B: Using systemd service**
   ```bash
   # Create a systemd service file
   sudo nano /etc/systemd/system/pms-startup.service

   # Add this content:
   [Unit]
   Description=PMS Application Startup with Migrations
   After=network.target postgresql.service

   [Service]
   Type=oneshot
   User=your-username
   WorkingDirectory=/path/to/pms-stable
   ExecStart=/path/to/pms-stable/pm2-startup.sh
   RemainAfterExit=yes

   [Install]
   WantedBy=multi-user.target

   # Enable and start the service
   sudo systemctl enable pms-startup.service
   sudo systemctl start pms-startup.service
   ```

### Manual Migration Management (Linux)

```bash
cd backend

# Check current migration status
./run-migrations.sh status

# View migration history
./run-migrations.sh history

# Apply all pending migrations (default)
./run-migrations.sh
./run-migrations.sh upgrade

# Create a new migration
./run-migrations.sh create

# Downgrade one migration (careful!)
./run-migrations.sh downgrade
```

---

## Deployment Workflow

### When Deploying Updates

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Restart PM2 apps** (migrations run automatically):
   ```bash
   pm2 restart all
   ```
   Or run the startup script again:
   ```bash
   # Windows
   .\pm2-startup.ps1

   # Linux
   ./pm2-startup.sh
   ```

### Creating New Migrations (Development)

1. **Make changes to your models** in `backend/models.py`

2. **Generate migration:**
   ```bash
   # Windows
   cd backend
   .\run-migrations.ps1 -Create

   # Linux
   cd backend
   ./run-migrations.sh create
   ```

3. **Review the generated migration file** in `backend/alembic/versions/`

4. **Test the migration:**
   ```bash
   # Apply it
   python -m alembic upgrade head

   # If issues, downgrade
   python -m alembic downgrade -1
   ```

5. **Commit the migration file** to git

6. **Deploy** - migrations will run automatically on server

---

## Troubleshooting

### Migration Fails on Startup

**Check logs:**
```bash
# Windows
type C:\Users\vem\pms-stable\pm2-startup.log

# Linux
cat /path/to/pms-stable/pm2-startup.log
```

**Common issues:**

1. **Database connection failed**
   - Check `DATABASE_URL` in ecosystem.config.js
   - Verify database is running: `pg_isready`
   - Check network connectivity to database

2. **Migration conflict**
   ```bash
   # Check migration status
   python -m alembic current
   python -m alembic heads

   # If heads show multiple branches, may need to merge
   python -m alembic merge -m "merge migrations" head1 head2
   ```

3. **Alembic version table missing**
   ```bash
   # Stamp the database with current version
   python -m alembic stamp head
   ```

4. **Python/Alembic not found**
   - Windows: Check PATH includes Python and Scripts directory
   - Linux: Activate virtual environment first
   - Verify: `python -m alembic --version`

### Application Won't Start

1. **Check PM2 logs:**
   ```bash
   pm2 logs
   pm2 logs pms-backend
   ```

2. **Check startup script logs:**
   ```bash
   # Windows
   type C:\Users\vem\pms-stable\pm2-startup.log

   # Linux
   tail -f /path/to/pms-stable/pm2-startup.log
   ```

3. **Verify migrations completed:**
   ```bash
   cd backend
   python -m alembic current
   ```

### Rollback a Bad Migration

```bash
# Check history
python -m alembic history

# Downgrade to specific revision
python -m alembic downgrade <revision_id>

# Or downgrade one step
python -m alembic downgrade -1

# Restart application
pm2 restart all
```

---

## Best Practices

1. **Always test migrations locally first** before deploying to production

2. **Backup database before major migrations:**
   ```bash
   pg_dump -U username -d pms_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Review auto-generated migrations** - Alembic's autogenerate is smart but not perfect

4. **Use migration messages** that clearly describe what changed

5. **Keep migrations small and focused** - easier to debug and rollback

6. **Never edit applied migrations** - create a new migration instead

7. **Monitor startup logs** regularly to catch migration issues early

---

## Additional Commands

### Database Backup (PostgreSQL)
```bash
# Full backup
pg_dump -U pms_user -d pms_db -F c -f backup.dump

# Restore
pg_restore -U pms_user -d pms_db backup.dump
```

### PM2 Management
```bash
# View running processes
pm2 status

# View logs
pm2 logs

# Restart specific app
pm2 restart pms-backend
pm2 restart pms-frontend

# Stop all
pm2 stop all

# Delete all processes
pm2 delete all
```

### Check Alembic Configuration
```bash
cd backend

# Show current version
python -m alembic current

# Show migration heads
python -m alembic heads

# Show full history
python -m alembic history

# Show pending migrations
python -m alembic history -r current:head
```

---

## Support

For issues or questions:
1. Check logs first (startup logs and PM2 logs)
2. Verify database connectivity
3. Ensure all dependencies are installed
4. Review migration files for any obvious issues

## Summary

With automatic migrations in place:
- ✅ Database schema stays synchronized with code
- ✅ No manual migration steps needed during deployment
- ✅ Application won't start if migrations fail (fail-safe)
- ✅ Full audit trail in logs
- ✅ Easy rollback capabilities
