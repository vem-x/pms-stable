# Scheduled Tasks Setup

This document explains how to set up automated tasks for the PMS system.

## Review Cycle Automation

The system automatically:
- **Activates** scheduled review cycles when their `start_date` arrives
- **Completes** active review cycles when their `end_date` passes

## Setup Instructions

### Option 1: Windows Task Scheduler

1. Open Task Scheduler
2. Create a new task:
   - **Name**: PMS Review Cycle Automation
   - **Trigger**: Daily at 12:00 AM (or every hour for more precision)
   - **Action**: Start a program
     - Program: `python`
     - Arguments: `C:\Users\DELL\makp\dev\PMS\backend\utils\scheduled_tasks.py`
     - Start in: `C:\Users\DELL\makp\dev\PMS\backend`

### Option 2: Linux/Mac Cron Job

Add this to your crontab (`crontab -e`):

```bash
# Run every hour at minute 0
0 * * * * cd /path/to/PMS/backend && /path/to/python utils/scheduled_tasks.py >> logs/scheduled_tasks.log 2>&1

# Or run every day at midnight
0 0 * * * cd /path/to/PMS/backend && /path/to/python utils/scheduled_tasks.py >> logs/scheduled_tasks.log 2>&1
```

### Option 3: Manual Execution (Testing)

You can manually run the task at any time:

```bash
cd backend
python utils/scheduled_tasks.py
```

## What It Does

### Activate Scheduled Cycles
- Checks for cycles with `status = 'scheduled'`
- If `start_date <= today`, changes status to `'active'`
- Participants can now start their reviews

### Complete Active Cycles
- Checks for cycles with `status = 'active'`
- If `end_date < today`, changes status to `'completed'`
- No more reviews can be submitted

## Monitoring

The script outputs status information when run:
```
✅ Activated review cycle: Q4 2024 Performance Review (ID: abc123)
🏁 Completed review cycle: Q3 2024 Performance Review (ID: def456)

📊 Summary:
   Activated: 1 cycles
   Completed: 1 cycles
```

## Recommended Schedule

- **Production**: Every hour (0 * * * *)
- **Development**: Daily at midnight (0 0 * * *)
- **Testing**: Manual execution as needed

## Future Enhancements

The `scheduled_tasks.py` file can be extended to include:
- Email notifications when cycles activate
- Reminder emails before cycles close
- Automatic report generation
- Performance data aggregation
