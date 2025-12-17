"""
Scheduled background tasks for the PMS system
Run this file periodically (e.g., every hour) using a cron job or task scheduler
"""

from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import ReviewCycle
from utils.email_service import EmailService


def activate_scheduled_review_cycles():
    """
    Activate review cycles that are scheduled and whose start_date has arrived
    Also close cycles whose end_date has passed
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now().date()

        # Find cycles that should be activated (scheduled + start_date <= today)
        scheduled_cycles = db.query(ReviewCycle).filter(
            ReviewCycle.status == 'SCHEDULED',
            ReviewCycle.start_date <= now
        ).all()

        for cycle in scheduled_cycles:
            cycle.status = 'ACTIVE'
            print(f"✅ Activated review cycle: {cycle.name} (ID: {cycle.id})")
            # TODO: Send email notifications to all participants

        # Find cycles that should be completed (active + end_date < today)
        active_cycles = db.query(ReviewCycle).filter(
            ReviewCycle.status == 'ACTIVE',
            ReviewCycle.end_date < now
        ).all()

        for cycle in active_cycles:
            cycle.status = 'COMPLETED'
            print(f"🏁 Completed review cycle: {cycle.name} (ID: {cycle.id})")
            # TODO: Send completion notification emails

        db.commit()

        if scheduled_cycles or active_cycles:
            print(f"\n📊 Summary:")
            print(f"   Activated: {len(scheduled_cycles)} cycles")
            print(f"   Completed: {len(active_cycles)} cycles")
        else:
            print("ℹ️  No cycles to update at this time")

    except Exception as e:
        print(f"❌ Error in scheduled task: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print(f"\n🔄 Running scheduled tasks at {datetime.now()}")
    print("=" * 60)
    activate_scheduled_review_cycles()
    print("=" * 60)
    print("✨ Done!\n")
