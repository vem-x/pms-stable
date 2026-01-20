"""
Script to clear all goal-related data from the database
Run this with: python clear_goals.py
"""

from sqlalchemy import create_engine, text
from database import get_db, engine
from models import (
    Goal, GoalProgressReport, GoalAssignment,
    GoalFreezeLog, GoalTag
)
import sys

def clear_goals_data():
    """
    Clear all goal-related data from the database
    This will delete:
    - All goals (company-wide, departmental, individual)
    - Goal progress reports
    - Goal assignments
    - Goal freeze logs
    - Goal tags and tag assignments
    """

    print("WARNING: This will delete ALL goals and related data!")
    print("This action cannot be undone.")
    response = input("Type 'YES' to confirm: ")

    if response != "YES":
        print("Operation cancelled.")
        return

    try:
        db = next(get_db())

        print("\nStarting deletion process...")

        # Delete in correct order due to foreign key constraints

        # 1. Delete goal tag assignments (association table)
        print("  - Deleting goal tag assignments...")
        result = db.execute(text("DELETE FROM goal_tag_assignments"))
        print(f"    Deleted {result.rowcount} tag assignments")

        # 2. Delete goal progress reports
        print("  - Deleting goal progress reports...")
        result = db.execute(text("DELETE FROM goal_progress_reports"))
        print(f"    Deleted {result.rowcount} progress reports")

        # 3. Delete goal assignments
        print("  - Deleting goal assignments...")
        result = db.execute(text("DELETE FROM goal_assignments"))
        print(f"    Deleted {result.rowcount} goal assignments")

        # 4. Delete goal freeze logs
        print("  - Deleting goal freeze logs...")
        result = db.execute(text("DELETE FROM goal_freeze_logs"))
        print(f"    Deleted {result.rowcount} freeze logs")

        # 5. Update initiatives to remove goal_id references
        print("  - Removing goal references from initiatives...")
        result = db.execute(text("UPDATE initiatives SET goal_id = NULL WHERE goal_id IS NOT NULL"))
        print(f"    Updated {result.rowcount} initiatives")

        # 6. Delete all goals
        print("  - Deleting all goals...")
        result = db.execute(text("DELETE FROM goals"))
        print(f"    Deleted {result.rowcount} goals")

        # 7. Delete goal tags
        print("  - Deleting goal tags...")
        result = db.execute(text("DELETE FROM goal_tags"))
        print(f"    Deleted {result.rowcount} tags")

        # Commit all changes
        db.commit()

        print("\nSuccessfully cleared all goal-related data!")
        print("You can now create fresh goals without any old data.")

    except Exception as e:
        print(f"\nError occurred: {e}")
        db.rollback()
        print("   Database rolled back - no changes made.")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    clear_goals_data()
