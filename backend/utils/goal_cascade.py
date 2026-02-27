"""
Goal cascade logic implementation
Based on CLAUDE.md specification for hierarchical goal achievement
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
import uuid

from models import Goal, GoalStatus, GoalProgressReport, User
from utils.notifications import NotificationService

class GoalCascadeService:
    """
    Implements cascading goal system where quarterly goals support yearly goals,
    and departmental goals can support either.
    """

    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)

    def check_goal_auto_achievement(self, goal_id: uuid.UUID) -> bool:
        """
        Auto-Achievement Check - run after any child goal status change
        Implementation of cascade logic from CLAUDE.md
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return False

        children = self.get_child_goals(goal_id)

        if len(children) == 0:
            return False  # No auto-achievement for leaf goals

        non_discarded_children = [child for child in children if child.status != GoalStatus.DISCARDED]
        achieved_children = [child for child in non_discarded_children if child.status == GoalStatus.ACHIEVED]

        if len(achieved_children) == len(non_discarded_children) and len(non_discarded_children) > 0:
            # All non-discarded children are achieved
            goal.status = GoalStatus.ACHIEVED
            goal.achieved_at = datetime.utcnow()
            goal.progress_percentage = 100

            self.db.commit()

            # Recursively check parent goal
            if goal.parent_goal_id:
                self.check_goal_auto_achievement(goal.parent_goal_id)

            # Send notifications
            self.notification_service.notify_goal_stakeholders(goal, 'auto_achieved')

            return True

        return False

    def update_goal_progress(self, goal_id: uuid.UUID, new_percentage: int,
                           report: str, updated_by: uuid.UUID) -> bool:
        """
        Update manual goal progress with required report
        Only allowed for goals without children (leaf goals)
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return False

        # Check if goal has children - only leaf goals can have manual progress updates
        children = self.get_child_goals(goal_id)
        if len(children) > 0:
            raise ValueError("Goals with children cannot have manual progress updates")

        # Create progress report entry
        old_percentage = goal.progress_percentage
        progress_report = GoalProgressReport(
            goal_id=goal_id,
            old_percentage=old_percentage,
            new_percentage=new_percentage,
            report=report,
            updated_by=updated_by
        )

        goal.progress_percentage = new_percentage

        # 100% progress → mark COMPLETED (not ACHIEVED).
        # Achieved bool is set separately by the supervisor via /assess endpoint.
        if new_percentage == 100 and goal.status == GoalStatus.ACTIVE:
            goal.status = GoalStatus.COMPLETED

        self.db.add(progress_report)
        self.db.commit()

        # If this goal reached 100%, check parent cascade.
        if new_percentage == 100 and goal.parent_goal_id:
            self.check_goal_auto_achievement(goal.parent_goal_id)

        # Send notifications
        self.notification_service.notify_goal_progress_updated(goal, progress_report)

        return True

    def discard_goal(self, goal_id: uuid.UUID, reason: str, discarded_by: uuid.UUID) -> bool:
        """
        Discard a goal and trigger parent cascade check
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return False

        goal.status = GoalStatus.DISCARDED
        goal.discarded_at = datetime.utcnow()

        self.db.commit()

        # Check parent goal cascade (discarded goals don't count towards achievement)
        if goal.parent_goal_id:
            self.check_goal_auto_achievement(goal.parent_goal_id)

        # Send notifications
        self.notification_service.notify_goal_discarded(goal, reason)

        return True

    def get_child_goals(self, goal_id: uuid.UUID) -> List[Goal]:
        """Get all child goals for a given goal"""
        return self.db.query(Goal).filter(Goal.parent_goal_id == goal_id).all()

    def get_goal_hierarchy(self, goal_id: uuid.UUID) -> dict:
        """
        Get complete goal hierarchy starting from specified goal
        Returns nested structure showing parent-child relationships
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return None

        def build_hierarchy(current_goal: Goal) -> dict:
            children = self.get_child_goals(current_goal.id)
            return {
                "goal": {
                    "id": str(current_goal.id),
                    "title": current_goal.title,
                    "type": current_goal.type.value,
                    "status": current_goal.status.value,
                    "progress_percentage": current_goal.progress_percentage,
                    "start_date": current_goal.start_date.isoformat(),
                    "end_date": current_goal.end_date.isoformat(),
                },
                "children": [build_hierarchy(child) for child in children]
            }

        return build_hierarchy(goal)

    def calculate_parent_progress(self, goal_id: uuid.UUID) -> int:
        """
        Calculate parent goal progress based on children
        Used for goals that have children (automatic progress calculation)
        """
        children = self.get_child_goals(goal_id)
        if len(children) == 0:
            return 0

        non_discarded_children = [child for child in children if child.status != GoalStatus.DISCARDED]
        if len(non_discarded_children) == 0:
            return 0

        total_progress = sum(child.progress_percentage for child in non_discarded_children)
        average_progress = total_progress / len(non_discarded_children)

        return int(average_progress)

    def update_parent_progress_automatically(self, goal_id: uuid.UUID):
        """
        Update parent goal progress based on children progress
        Called when child goal progress changes
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return

        children = self.get_child_goals(goal_id)
        if len(children) > 0:
            # This goal has children, calculate automatic progress
            new_progress = self.calculate_parent_progress(goal_id)
            goal.progress_percentage = new_progress
            self.db.commit()

            # Recursively update parent if it exists
            if goal.parent_goal_id:
                self.update_parent_progress_automatically(goal.parent_goal_id)

    def validate_goal_relationship(self, parent_goal_id: uuid.UUID, child_goal: Goal) -> bool:
        """
        Validate that goal parent-child relationship is valid
        Based on CLAUDE.md business rules
        """
        if not parent_goal_id:
            return True  # No parent is always valid

        parent_goal = self.db.query(Goal).filter(Goal.id == parent_goal_id).first()
        if not parent_goal:
            return False

        # Date validation - child must be within parent date range
        # if child_goal.start_date < parent_goal.start_date or child_goal.end_date > parent_goal.end_date:
        #     return False

        # Type hierarchy validation
        if parent_goal.type.value == "yearly":
            return child_goal.type.value in ["quarterly", "departmental"]
        elif parent_goal.type.value == "quarterly":
            return child_goal.type.value == "departmental"
        elif parent_goal.type.value == "departmental":
            return False  # Departmental goals cannot have children

        return True

    def get_goal_chain(self, goal_id: uuid.UUID) -> List[Goal]:
        """
        Get complete chain from root goal to specified goal
        Returns list ordered from root to target goal
        """
        chain = []
        current_goal = self.db.query(Goal).filter(Goal.id == goal_id).first()

        while current_goal:
            chain.insert(0, current_goal)  # Insert at beginning to maintain order
            if current_goal.parent_goal_id:
                current_goal = self.db.query(Goal).filter(Goal.id == current_goal.parent_goal_id).first()
            else:
                break

        return chain

    def get_goals_by_type_and_period(self, goal_type: str, start_date: datetime, end_date: datetime) -> List[Goal]:
        """Get goals of specific type within date range"""
        return self.db.query(Goal).filter(
            and_(
                Goal.type == goal_type,
                Goal.start_date >= start_date.date(),
                Goal.end_date <= end_date.date()
            )
        ).all()

    def get_orphaned_goals(self) -> List[Goal]:
        """
        Get goals that should have parents but don't
        Useful for data integrity checks
        """
        return self.db.query(Goal).filter(
            and_(
                Goal.parent_goal_id.is_(None),
                Goal.type.in_(["quarterly", "departmental"])
            )
        ).all()