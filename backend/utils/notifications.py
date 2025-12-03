"""
Notification service for real-time notifications and emails
Implementation for notification triggers with database persistence
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import (
    User, Initiative, Goal, InitiativeExtension,
    Notification, NotificationType, NotificationPriority
)
from utils.email_service import EmailService
import uuid
from datetime import datetime, timedelta

class NotificationService:
    """
    Handles all notification triggers
    Persists notifications to database and sends emails for important events
    """

    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()

    def create_notification(
        self,
        user_id: uuid.UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        action_url: Optional[str] = None,
        data: Optional[dict] = None,
        triggered_by: Optional[uuid.UUID] = None,
        expires_in_days: Optional[int] = None
    ) -> Notification:
        """Create and persist a notification, then send via WebSocket"""
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

        notification = Notification(
            user_id=user_id,
            type=notification_type,
            priority=priority,
            title=title,
            message=message,
            action_url=action_url,
            data=data or {},
            triggered_by=triggered_by,
            expires_at=expires_at
        )

        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        # Send real-time notification via WebSocket
        self._send_websocket_notification(notification)

        return notification

    def _send_websocket_notification(self, notification: Notification):
        """Send notification via WebSocket in real-time"""
        try:
            from utils.websocket_manager import manager
            import asyncio
            import threading

            # Get trigger user name if applicable
            triggered_by_name = None
            if notification.triggered_by:
                trigger_user = self.db.query(User).filter(
                    User.id == notification.triggered_by
                ).first()
                if trigger_user:
                    triggered_by_name = trigger_user.name

            # Prepare notification data
            notification_data = {
                "type": "new_notification",
                "notification": {
                    "id": str(notification.id),
                    "type": notification.type.value,
                    "priority": notification.priority.value,
                    "title": notification.title,
                    "message": notification.message,
                    "action_url": notification.action_url,
                    "data": notification.data,
                    "triggered_by_name": triggered_by_name,
                    "created_at": notification.created_at.isoformat(),
                    "is_read": False
                }
            }

            # Send via WebSocket if user is connected
            # Run async function in background thread to avoid blocking
            def send_async():
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(
                        manager.send_personal_notification(notification.user_id, notification_data)
                    )
                    loop.close()
                except Exception as e:
                    print(f"Error in async notification send: {e}")

            # Run in background thread
            thread = threading.Thread(target=send_async, daemon=True)
            thread.start()

        except Exception as e:
            # Don't fail notification creation if WebSocket fails
            print(f"Failed to send WebSocket notification: {e}")

    # Initiative-related notifications
    def notify_initiative_created(self, initiative: Initiative, creator: User, supervisor: User):
        """
        Notify supervisor when an initiative is created and needs approval
        """
        try:
            self.create_notification(
                user_id=supervisor.id,
                notification_type=NotificationType.INITIATIVE_CREATED,
                title="Initiative Approval Required",
                message=f"{creator.name} has created an initiative '{initiative.title}' that requires your approval",
                priority=NotificationPriority.HIGH,
                action_url=f"/dashboard/initiatives/{initiative.id}",
                data={
                    "initiative_id": str(initiative.id),
                    "initiative_title": initiative.title,
                    "creator_id": str(creator.id),
                    "creator_name": creator.name
                },
                triggered_by=creator.id
            )

            # Also send email
            if supervisor.email:
                due_date = initiative.due_date.strftime("%B %d, %Y at %I:%M %p") if initiative.due_date else "Not specified"
                try:
                    self.email_service.send_initiative_approval_request_email(
                        supervisor_email=supervisor.email,
                        supervisor_name=supervisor.name or supervisor.email,
                        creator_name=creator.name or creator.email,
                        initiative_title=initiative.title,
                        initiative_id=str(initiative.id),
                        due_date=due_date
                    )
                    print(f"✓ Initiative approval request email sent to {supervisor.email}")
                except Exception as e:
                    print(f"✗ Failed to send initiative approval request email: {e}")

        except Exception as e:
            print(f"Error in notify_initiative_created: {e}")

    def notify_initiative_approved(self, initiative: Initiative, assignees: List[User], approver: User):
        """
        Notify assignees when supervisor approves an initiative
        This is for the initial approval, not the final review
        """
        try:
            for assignee in assignees:
                self.create_notification(
                    user_id=assignee.id,
                    notification_type=NotificationType.INITIATIVE_APPROVED,
                    title="Initiative Approved",
                    message=f"Your supervisor {approver.name} has approved the initiative '{initiative.title}'",
                    priority=NotificationPriority.MEDIUM,
                    action_url=f"/dashboard/initiatives/{initiative.id}",
                    data={
                        "initiative_id": str(initiative.id),
                        "initiative_title": initiative.title,
                        "approver_id": str(approver.id),
                        "approver_name": approver.name
                    },
                    triggered_by=approver.id
                )

                # Also send email
                if assignee.email:
                    due_date = initiative.due_date.strftime("%B %d, %Y at %I:%M %p") if initiative.due_date else "Not specified"
                    try:
                        self.email_service.send_initiative_approved_email(
                            assignee_email=assignee.email,
                            assignee_name=assignee.name or assignee.email,
                            approver_name=approver.name or approver.email,
                            initiative_title=initiative.title,
                            initiative_id=str(initiative.id),
                            due_date=due_date
                        )
                        print(f"✓ Initiative approval email sent to {assignee.email}")
                    except Exception as e:
                        print(f"✗ Failed to send initiative approval email: {e}")

        except Exception as e:
            print(f"Error in notify_initiative_approved: {e}")

    def notify_initiative_rejected(self, initiative: Initiative, creator: User, supervisor: User, rejection_reason: str):
        """
        Notify creator when supervisor rejects an initiative
        """
        try:
            self.create_notification(
                user_id=creator.id,
                notification_type=NotificationType.INITIATIVE_REJECTED,
                title="Initiative Rejected",
                message=f"Your supervisor {supervisor.name} has rejected the initiative '{initiative.title}'",
                priority=NotificationPriority.HIGH,
                action_url=f"/dashboard/initiatives/{initiative.id}",
                data={
                    "initiative_id": str(initiative.id),
                    "initiative_title": initiative.title,
                    "supervisor_id": str(supervisor.id),
                    "supervisor_name": supervisor.name,
                    "rejection_reason": rejection_reason
                },
                triggered_by=supervisor.id
            )

            # Also send email
            if creator.email:
                try:
                    self.email_service.send_initiative_rejected_email(
                        creator_email=creator.email,
                        creator_name=creator.name or creator.email,
                        supervisor_name=supervisor.name or supervisor.email,
                        initiative_title=initiative.title,
                        initiative_id=str(initiative.id),
                        rejection_reason=rejection_reason
                    )
                    print(f"✓ Initiative rejection email sent to {creator.email}")
                except Exception as e:
                    print(f"✗ Failed to send initiative rejection email: {e}")

        except Exception as e:
            print(f"Error in notify_initiative_rejected: {e}")

    def notify_initiative_assigned(self, initiative: Initiative, assignees: List[User], created_by: User):
        """Notify users when task is assigned"""
        try:
            due_date = initiative.due_date.strftime("%B %d, %Y at %I:%M %p") if initiative.due_date else "Not specified"

            for assignee in assignees:
                if assignee.email and assignee.status == 'active':
                    try:
                        self.email_service.send_initiative_assignment_email(
                            user_email=assignee.email,
                            user_name=assignee.name or assignee.email,
                            initiative_title=initiative.title,
                            initiative_id=str(initiative.id),
                            due_date=due_date,
                            created_by_name=created_by.name or created_by.email
                        )
                        print(f"✓ Task assignment email sent to {assignee.email}")
                    except Exception as e:
                        print(f"✗ Failed to send task assignment email to {assignee.email}: {e}")
        except Exception as e:
            print(f"Error in notify_initiative_assigned: {e}")

    def notify_initiative_submitted(self, initiative: Initiative, submission, submitted_by: User):
        """Notify task creator when task is submitted"""
        try:
            creator = self.db.query(User).filter(User.id == initiative.created_by).first()
            if creator and creator.email and creator.status == 'active':
                try:
                    self.email_service.send_task_submitted_email(
                        creator_email=creator.email,
                        creator_name=creator.name or creator.email,
                        initiative_title=initiative.title,
                        submitted_by_name=submitted_by.name or submitted_by.email
                    )
                    print(f"✓ Task submission email sent to {creator.email}")
                except Exception as e:
                    print(f"✗ Failed to send task submission email: {e}")
        except Exception as e:
            print(f"Error in notify_initiative_submitted: {e}")

    def notify_task_reviewed(self, initiative: Initiative, assignees: List[User], score: int, feedback: str, approved: bool):
        """Notify assignees when task is reviewed"""
        try:
            for assignee in assignees:
                if assignee.email and assignee.status == 'active':
                    try:
                        self.email_service.send_task_reviewed_email(
                            assignee_email=assignee.email,
                            assignee_name=assignee.name or assignee.email,
                            initiative_title=initiative.title,
                            score=score,
                            feedback=feedback or "",
                            approved=approved
                        )
                        print(f"✓ Task review email sent to {assignee.email}")
                    except Exception as e:
                        print(f"✗ Failed to send task review email to {assignee.email}: {e}")
        except Exception as e:
            print(f"Error in notify_task_reviewed: {e}")

    def notify_initiative_approved(self, initiative: Initiative, assignees: List[User], score: int):
        """Notify assignees when initiative is approved"""
        self.notify_task_reviewed(initiative, assignees, score, initiative.feedback or "", True)

    def notify_initiative_redo_requested(self, initiative: Initiative, assignees: List[User], feedback: str):
        """Notify assignees when redo is requested"""
        self.notify_task_reviewed(initiative, assignees, initiative.score or 0, feedback, False)

    def notify_initiative_overdue(self, initiative: Initiative, stakeholders: List[User]):
        """Notify stakeholders when task becomes overdue"""
        # TODO: Implement overdue notification email
        print(f"Task {initiative.title} is overdue")

    def notify_extension_requested(self, initiative: Initiative, extension: InitiativeExtension):
        """Notify initiative creator when extension is requested"""
        # TODO: Implement extension request notification
        print(f"Extension requested for initiative {initiative.title}")

    def notify_extension_reviewed(self, extension: InitiativeExtension, approved: bool):
        """Notify requester when extension is reviewed"""
        # TODO: Implement extension review notification
        print(f"Extension {'approved' if approved else 'denied'}")

    # Goal-related notifications

    def notify_goal_created(self, goal: Goal, created_by: User):
        """Notify supervisor when supervisee creates a personal goal"""
        if goal.type.value != "INDIVIDUAL":
            return

        if created_by.supervisor_id:
            self.create_notification(
                user_id=created_by.supervisor_id,
                notification_type=NotificationType.GOAL_CREATED,
                title="New Goal Awaiting Approval",
                message=f"{created_by.name} has created a new goal '{goal.title}' that requires your approval.",
                priority=NotificationPriority.MEDIUM,
                action_url=f"/goals/{goal.id}",
                data={"goal_id": str(goal.id)},
                triggered_by=created_by.id
            )

    def notify_goal_assigned(self, goal: Goal, assigned_by: User, assigned_to: User):
        """Notify when supervisor assigns a goal to supervisee"""
        self.create_notification(
            user_id=assigned_to.id,
            notification_type=NotificationType.GOAL_ASSIGNED,
            title="New Goal Assigned to You",
            message=f"{assigned_by.name} has assigned you a new goal: '{goal.title}'. Please review and accept or decline.",
            priority=NotificationPriority.HIGH,
            action_url=f"/goals/{goal.id}/respond",
            data={"goal_id": str(goal.id)},
            triggered_by=assigned_by.id
        )

    def notify_goal_approved(self, goal: Goal, approved_by: User, goal_owner: User):
        """Notify when supervisor approves a personal goal"""
        self.create_notification(
            user_id=goal_owner.id,
            notification_type=NotificationType.GOAL_APPROVED,
            title="Goal Approved",
            message=f"{approved_by.name} has approved your goal '{goal.title}'.",
            priority=NotificationPriority.MEDIUM,
            action_url=f"/goals/{goal.id}",
            data={"goal_id": str(goal.id)},
            triggered_by=approved_by.id
        )

    def notify_goal_rejected(self, goal: Goal, rejected_by: User, goal_owner: User, reason: str):
        """Notify when supervisor rejects a personal goal"""
        self.create_notification(
            user_id=goal_owner.id,
            notification_type=NotificationType.GOAL_REJECTED,
            title="Goal Rejected",
            message=f"{rejected_by.name} has rejected your goal '{goal.title}'. Reason: {reason}",
            priority=NotificationPriority.HIGH,
            action_url=f"/goals/{goal.id}",
            data={"goal_id": str(goal.id), "reason": reason},
            triggered_by=rejected_by.id
        )

    def notify_goal_accepted(self, goal: Goal, accepted_by: User, assigned_by: User):
        """Notify supervisor when supervisee accepts assigned goal"""
        self.create_notification(
            user_id=assigned_by.id,
            notification_type=NotificationType.GOAL_ACCEPTED,
            title="Goal Accepted",
            message=f"{accepted_by.name} has accepted the goal '{goal.title}' you assigned to them.",
            priority=NotificationPriority.MEDIUM,
            action_url=f"/goals/{goal.id}",
            data={"goal_id": str(goal.id)},
            triggered_by=accepted_by.id
        )

    def notify_goal_declined(self, goal: Goal, declined_by: User, assigned_by: User, reason: str):
        """Notify supervisor when supervisee declines assigned goal"""
        self.create_notification(
            user_id=assigned_by.id,
            notification_type=NotificationType.GOAL_DECLINED,
            title="Goal Declined",
            message=f"{declined_by.name} has declined the goal '{goal.title}'. Reason: {reason}",
            priority=NotificationPriority.HIGH,
            action_url=f"/goals/{goal.id}",
            data={"goal_id": str(goal.id), "reason": reason},
            triggered_by=declined_by.id
        )

    def notify_goal_change_requested(self, goal: Goal, requested_by: User, supervisor: User, change_request: str):
        """Notify supervisor when supervisee requests a change to their goal"""
        self.create_notification(
            user_id=supervisor.id,
            notification_type=NotificationType.GOAL_ACCEPTANCE_REQUIRED,
            title="Goal Change Requested",
            message=f"{requested_by.name} has requested changes to the goal '{goal.title}'. Request: {change_request}",
            priority=NotificationPriority.MEDIUM,
            action_url=f"/goals/{goal.id}",
            data={"goal_id": str(goal.id), "change_request": change_request},
            triggered_by=requested_by.id
        )

    def notify_goal_stakeholders(self, goal: Goal, event_type: str):
        """Notify stakeholders about goal events"""
        # TODO: Implement goal notification emails
        print(f"Goal event: {event_type} for {goal.title}")

    def notify_goal_progress_updated(self, goal: Goal, report):
        """Notify when goal progress is updated"""
        # TODO: Implement goal progress notification
        print(f"Goal progress updated: {goal.title}")

    def notify_goal_discarded(self, goal: Goal, reason: str):
        """Notify when goal is discarded"""
        # TODO: Implement goal discard notification
        print(f"Goal discarded: {goal.title}")

    def notify_goals_frozen(self, quarter: str, year: int, affected_user_ids: List[uuid.UUID], frozen_by: User):
        """Notify users when their goals have been frozen for a quarter"""
        for user_id in affected_user_ids:
            self.create_notification(
                user_id=user_id,
                notification_type=NotificationType.SYSTEM_ANNOUNCEMENT,
                title="Goals Frozen for Quarter",
                message=f"{frozen_by.name} has frozen all goals for {quarter} {year}. You cannot edit your goals until they are unfrozen.",
                priority=NotificationPriority.HIGH,
                action_url=f"/goals?quarter={quarter}&year={year}",
                data={"quarter": quarter, "year": year, "action": "freeze"},
                triggered_by=frozen_by.id
            )

    def notify_goals_unfrozen(self, quarter: str, year: int, affected_user_ids: List[uuid.UUID], unfrozen_by: User, is_emergency: bool = False):
        """Notify users when their goals have been unfrozen for a quarter"""
        emergency_note = " (Emergency Override)" if is_emergency else ""
        for user_id in affected_user_ids:
            self.create_notification(
                user_id=user_id,
                notification_type=NotificationType.SYSTEM_ANNOUNCEMENT,
                title=f"Goals Unfrozen{emergency_note}",
                message=f"{unfrozen_by.name} has unfrozen goals for {quarter} {year}. You can now edit your goals{emergency_note}.",
                priority=NotificationPriority.MEDIUM if not is_emergency else NotificationPriority.HIGH,
                action_url=f"/goals?quarter={quarter}&year={year}",
                data={"quarter": quarter, "year": year, "action": "unfreeze", "emergency": is_emergency},
                triggered_by=unfrozen_by.id
            )

    # User-related notifications
    def notify_user_created(self, user: User, onboarding_token: str):
        """Send onboarding email to new user"""
        try:
            if user.email:
                self.email_service.send_onboarding_email(
                    user_email=user.email,
                    user_name=user.name or user.email,
                    onboarding_token=onboarding_token
                )
                print(f"✓ Onboarding email sent to {user.email}")
        except Exception as e:
            print(f"✗ Failed to send onboarding email: {e}")

    def notify_password_reset(self, user: User, reset_token: str):
        """Send password reset email"""
        try:
            if user.email:
                self.email_service.send_password_reset_email(
                    user_email=user.email,
                    user_name=user.name or user.email,
                    reset_token=reset_token
                )
                print(f"✓ Password reset email sent to {user.email}")
        except Exception as e:
            print(f"✗ Failed to send password reset email: {e}")

    def notify_user_status_changed(self, user: User, old_status: str, new_status: str):
        """Notify relevant users when user status changes"""
        # TODO: Implement status change notification
        print(f"User {user.email} status changed: {old_status} -> {new_status}")

    def notify_user_role_changed(self, user: User, old_role: str, new_role: str):
        """Notify administrators when user role changes"""
        # TODO: Implement role change notification
        print(f"User {user.email} role changed: {old_role} -> {new_role}")