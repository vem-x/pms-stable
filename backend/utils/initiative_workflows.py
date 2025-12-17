"""
Initiative workflow implementation
Based on CLAUDE.md specification for initiative management workflows
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
import uuid

from models import (
    Initiative, InitiativeStatus, InitiativeType, InitiativeUrgency, InitiativeAssignment, InitiativeSubmission,
    InitiativeDocument, InitiativeExtension, ExtensionStatus, User, UserStatus
)
from utils.notifications import NotificationService
from utils.permissions import UserPermissions

class InitiativeWorkflowService:
    """
    Implements initiative workflows including assignment, submission, review, and overdue management
    """

    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
        self.permission_service = UserPermissions(db)

    def create_initiative(self, creator: User, initiative_data: dict, assignee_ids: List[uuid.UUID],
                          team_head_id: Optional[uuid.UUID] = None, document_ids: Optional[List[uuid.UUID]] = None) -> Initiative:
        """
        Create new initiative with scope validation and assignment

        Business Logic:
        - If creator is assigning to themselves: Status = PENDING_APPROVAL (requires supervisor approval)
        - If creator is a supervisor creating for supervisee(s): Status = ASSIGNED (no approval needed)
        - Any other case defaults to PENDING_APPROVAL for safety
        """
        # Validate assignment scope
        self.validate_initiative_assignment(creator, assignee_ids)

        # Validate document ownership if documents are provided
        if document_ids:
            self.validate_document_ownership(creator, document_ids)

        # Determine initial status based on business rules
        # Check if creator is assigning to themselves
        is_self_assigned = creator.id in assignee_ids and len(assignee_ids) == 1

        # Check if creator has supervisees (is a supervisor)
        has_supervisees = self.db.query(User).filter(User.supervisor_id == creator.id).count() > 0

        # Determine initial status
        if is_self_assigned:
            # Individual creating initiative for themselves - needs approval
            initial_status = InitiativeStatus.PENDING_APPROVAL
        elif has_supervisees and creator.id not in assignee_ids:
            # Supervisor creating for others (not including self) - no approval needed
            initial_status = InitiativeStatus.ASSIGNED
            assigned_by = creator.id
        else:
            # Default to pending approval for safety
            initial_status = InitiativeStatus.PENDING_APPROVAL
            assigned_by = None

        # Create initiative
        initiative = Initiative(
            title=initiative_data['title'],
            description=initiative_data.get('description'),
            type=initiative_data['type'],
            urgency=initiative_data.get('urgency', 'medium'),
            due_date=initiative_data['due_date'],
            created_by=creator.id,
            assigned_by=assigned_by if initial_status == InitiativeStatus.ASSIGNED else None,
            team_head_id=team_head_id,
            status=initial_status
        )

        if initial_status == InitiativeStatus.ASSIGNED:
            initiative.approved_at = datetime.utcnow()

        self.db.add(initiative)
        self.db.flush()  # Get initiative ID

        # Create assignments
        for assignee_id in assignee_ids:
            assignment = InitiativeAssignment(
                initiative_id=initiative.id,
                user_id=assignee_id
            )
            self.db.add(assignment)

        # Attach documents if provided
        if document_ids:
            self.attach_documents_to_initiative(initiative.id, document_ids)

        self.db.commit()

        # Send notifications based on initial status
        assignees = self.db.query(User).filter(User.id.in_(assignee_ids)).all()

        if initial_status == InitiativeStatus.PENDING_APPROVAL:
            # Notify supervisor that initiative needs approval
            if creator.supervisor:
                self.notification_service.notify_initiative_created(initiative, creator, creator.supervisor)
        elif initial_status == InitiativeStatus.ASSIGNED:
            # Notify assignees that initiative has been assigned to them
            self.notification_service.notify_initiative_assigned(initiative, assignees, creator)

        return initiative

    def validate_initiative_assignment(self, creator: User, assignee_ids: List[uuid.UUID]):
        """
        Validate that creator can assign initiatives to specified users

        Assignment Scope Rules:
        - Users with 'initiative_view_all' permission: Can assign to anyone in accessible organizations
        - Regular users: Can assign to anyone in their department (same organization_id)
        - Cannot assign to inactive users
        """
        for assignee_id in assignee_ids:
            assignee = self.db.query(User).filter(User.id == assignee_id).first()
            if not assignee:
                raise ValueError(f"User {assignee_id} not found")

            # Check if user has global assignment permission
            if self.permission_service.user_has_permission(creator, "initiative_view_all"):
                # Users with initiative_view_all can assign within their accessible organizations
                if not self.permission_service.user_can_access_organization(creator, assignee.organization_id):
                    raise ValueError(f"Cannot assign initiative to user outside your scope: {assignee.name}")
            else:
                # Regular users can only assign within their department (same organization)
                if creator.organization_id != assignee.organization_id:
                    raise ValueError(f"Cannot assign initiative to user outside your department: {assignee.name}")

            if assignee.status != UserStatus.ACTIVE:
                raise ValueError(f"Cannot assign initiative to inactive user: {assignee.name}")

    def validate_document_ownership(self, creator: User, document_ids: List[uuid.UUID]):
        """
        Validate that creator owns all specified documents
        """
        for document_id in document_ids:
            document = self.db.query(InitiativeDocument).filter(InitiativeDocument.id == document_id).first()
            if not document:
                raise ValueError(f"Document {document_id} not found")
            if document.uploaded_by != creator.id:
                raise ValueError(f"Cannot attach document not owned by you: {document.file_name}")
            if document.initiative_id is not None:
                raise ValueError(f"Document {document.file_name} is already attached to another initiative")

    def attach_documents_to_initiative(self, initiative_id: uuid.UUID, document_ids: List[uuid.UUID]):
        """
        Attach pre-uploaded documents to an initiative
        """
        for document_id in document_ids:
            document = self.db.query(InitiativeDocument).filter(InitiativeDocument.id == document_id).first()
            if document:
                document.initiative_id = initiative_id

    def start_initiative(self, initiative_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """
        Start an initiative (change status from ASSIGNED to STARTED)
        """
        initiative = self.db.query(Initiative).filter(Initiative.id == initiative_id).first()
        if not initiative:
            return False

        if initiative.status != InitiativeStatus.ASSIGNED:
            raise ValueError("Initiative can only be started from ASSIGNED status")

        # Verify user is assigned to initiative
        assignment = self.db.query(InitiativeAssignment).filter(
            and_(InitiativeAssignment.initiative_id == initiative_id, InitiativeAssignment.user_id == user_id)
        ).first()

        if not assignment:
            raise ValueError("User is not assigned to this initiative")

        initiative.status = InitiativeStatus.STARTED
        self.db.commit()

        return True

    def submit_initiative(self, initiative_id: uuid.UUID, user_id: uuid.UUID, report: str,
                          document_ids: Optional[List[uuid.UUID]] = None) -> bool:
        """
        Submit initiative completion report
        For group initiatives, only team head can submit
        """
        initiative = self.db.query(Initiative).filter(Initiative.id == initiative_id).first()
        if not initiative:
            return False

        if initiative.status == InitiativeStatus.OVERDUE:
            # Check if there's a pending extension
            pending_extension = self.db.query(InitiativeExtension).filter(
                and_(
                    InitiativeExtension.initiative_id == initiative_id,
                    InitiativeExtension.status == ExtensionStatus.PENDING
                )
            ).first()
            if pending_extension:
                raise ValueError("Cannot submit overdue initiative with pending extension request")

        if initiative.status not in [InitiativeStatus.STARTED, InitiativeStatus.OVERDUE]:
            raise ValueError("Initiative must be started to submit")

        # For group initiatives, verify submitter is team head
        if initiative.type == InitiativeType.GROUP:
            if initiative.team_head_id != user_id:
                raise ValueError("Only team head can submit group initiatives")
        else:
            # For individual initiatives, verify submitter is assigned
            assignment = self.db.query(InitiativeAssignment).filter(
                and_(InitiativeAssignment.initiative_id == initiative_id, InitiativeAssignment.user_id == user_id)
            ).first()
            if not assignment:
                raise ValueError("User is not assigned to this initiative")

        # Create submission
        submission = InitiativeSubmission(
            initiative_id=initiative_id,
            report=report,
            submitted_by=user_id
        )
        self.db.add(submission)

        # Link documents if provided
        if document_ids:
            for doc_id in document_ids:
                doc = self.db.query(InitiativeDocument).filter(
                    and_(InitiativeDocument.id == doc_id, InitiativeDocument.initiative_id == initiative_id)
                ).first()
                if not doc:
                    raise ValueError(f"Document {doc_id} not found or not associated with this initiative")

        initiative.status = InitiativeStatus.UNDER_REVIEW
        self.db.commit()

        submitted_by = self.db.query(User).filter(User.id == user_id).first()
        if submitted_by:
            self.notification_service.notify_initiative_submitted(initiative, submission, submitted_by)

        return True

    def review_initiative(self, initiative_id: uuid.UUID, reviewer_id: uuid.UUID, score: int,
                          feedback: Optional[str] = None, approved: bool = True) -> bool:
        """
        Review and score submitted initiative (UNDER_REVIEW status)

        Workflow:
        - If approved=True: Initiative → APPROVED (with score/grade)
        - If approved=False: Initiative → ONGOING (redo requested with feedback)

        Only initiative creator/supervisor can review
        """
        initiative = self.db.query(Initiative).filter(Initiative.id == initiative_id).first()
        if not initiative:
            return False

        if initiative.status != InitiativeStatus.UNDER_REVIEW:
            raise ValueError(f"Initiative must be UNDER_REVIEW to review (current status: {initiative.status})")

        # Allow both creator and supervisor to review
        creator = self.db.query(User).filter(User.id == initiative.created_by).first()
        is_supervisor = creator and creator.supervisor_id == reviewer_id

        if initiative.created_by != reviewer_id and not is_supervisor:
            raise ValueError("Only initiative creator or supervisor can review submissions")

        if not (1 <= score <= 10):
            raise ValueError("Score must be between 1 and 10")

        initiative.score = score
        initiative.feedback = feedback
        initiative.reviewed_at = datetime.utcnow()

        if approved:
            # Approve with final grade
            initiative.status = InitiativeStatus.APPROVED
            assignees = [assignment.user for assignment in initiative.assignments]
            self.notification_service.notify_initiative_approved(initiative, assignees, score)
        else:
            # Request redo - send back to ONGOING status
            initiative.status = InitiativeStatus.ONGOING
            assignees = [assignment.user for assignment in initiative.assignments]
            self.notification_service.notify_initiative_redo_requested(initiative, assignees, feedback)

        self.db.commit()
        return True

    def approve_initiative(self, initiative_id: uuid.UUID, approver_id: uuid.UUID,
                           approved: bool, rejection_reason: Optional[str] = None) -> bool:
        """
        Approve or reject a pending initiative
        Only the supervisor of the initiative creator can approve

        Args:
            initiative_id: ID of the initiative to approve
            approver_id: ID of the user approving/rejecting
            approved: True to approve, False to reject
            rejection_reason: Required if rejected

        Returns:
            bool: True if successful

        Raises:
            ValueError: If validation fails
        """
        initiative = self.db.query(Initiative).filter(Initiative.id == initiative_id).first()
        if not initiative:
            raise ValueError("Initiative not found")

        if initiative.status != InitiativeStatus.PENDING_APPROVAL:
            raise ValueError(f"Initiative is not pending approval (current status: {initiative.status})")

        # Get the initiative creator
        creator = self.db.query(User).filter(User.id == initiative.created_by).first()
        if not creator:
            raise ValueError("Initiative creator not found")

        # Verify approver is the creator's supervisor
        if creator.supervisor_id != approver_id:
            raise ValueError("Only the initiative creator's supervisor can approve this initiative")

        # Apply approval/rejection
        if approved:
            # When supervisor approves a staff-created initiative, it goes to PENDING (ready to start)
            initiative.status = InitiativeStatus.PENDING
            initiative.assigned_by = approver_id
            initiative.approved_at = datetime.utcnow()
            initiative.rejected_at = None

            # Send notification to assignees
            assignees = [assignment.user for assignment in initiative.assignments]
            approver = self.db.query(User).filter(User.id == approver_id).first()
            self.notification_service.notify_initiative_approved(initiative, assignees, approver)
        else:
            if not rejection_reason:
                raise ValueError("Rejection reason is required when rejecting an initiative")

            initiative.status = InitiativeStatus.REJECTED
            initiative.feedback = rejection_reason  # Store rejection reason in feedback field
            initiative.rejected_at = datetime.utcnow()
            initiative.assigned_by = None

            # Send notification to creator
            approver = self.db.query(User).filter(User.id == approver_id).first()
            self.notification_service.notify_initiative_rejected(initiative, creator, approver, rejection_reason)

        self.db.commit()
        return True

    def request_extension(self, initiative_id: uuid.UUID, user_id: uuid.UUID,
                          new_due_date: datetime, reason: str) -> InitiativeExtension:
        """
        Request deadline extension for initiative
        """
        initiative = self.db.query(Initiative).filter(Initiative.id == initiative_id).first()
        if not initiative:
            raise ValueError("Initiative not found")

        if initiative.type == InitiativeType.GROUP:
            if initiative.team_head_id != user_id:
                raise ValueError("Only team head can request extensions for group initiatives")
        else:
            assignment = self.db.query(InitiativeAssignment).filter(
                and_(InitiativeAssignment.initiative_id == initiative_id, InitiativeAssignment.user_id == user_id)
            ).first()
            if not assignment:
                raise ValueError("User is not assigned to this initiative")

        existing_extension = self.db.query(InitiativeExtension).filter(
            and_(
                InitiativeExtension.initiative_id == initiative_id,
                InitiativeExtension.status == ExtensionStatus.PENDING
            )
        ).first()

        if existing_extension:
            raise ValueError("Extension request already pending for this initiative")

        extension = InitiativeExtension(
            initiative_id=initiative_id,
            requested_by=user_id,
            new_due_date=new_due_date,
            reason=reason
        )

        self.db.add(extension)
        self.db.commit()

        self.notification_service.notify_extension_requested(initiative, extension)

        return extension

    def review_extension(self, extension_id: uuid.UUID, reviewer_id: uuid.UUID,
                         approved: bool, reason: Optional[str] = None) -> bool:
        """
        Approve or deny extension request
        Only initiative creator can review extensions
        """
        extension = self.db.query(InitiativeExtension).filter(InitiativeExtension.id == extension_id).first()
        if not extension:
            return False

        initiative = extension.initiative
        if initiative.created_by != reviewer_id:
            raise ValueError("Only initiative creator can review extension requests")

        if extension.status != ExtensionStatus.PENDING:
            raise ValueError("Extension request has already been reviewed")

        if approved:
            extension.status = ExtensionStatus.APPROVED
            initiative.due_date = extension.new_due_date
            if initiative.status == InitiativeStatus.OVERDUE:
                initiative.status = InitiativeStatus.ONGOING
        else:
            extension.status = ExtensionStatus.DENIED

        extension.reviewed_by = reviewer_id
        self.db.commit()

        self.notification_service.notify_extension_reviewed(extension, approved)

        return True

    def update_overdue_initiatives(self):
        """
        Daily cron job to mark initiatives as overdue
        """
        now = datetime.utcnow()
        active_initiatives = self.db.query(Initiative).filter(
            Initiative.status.in_([InitiativeStatus.PENDING, InitiativeStatus.ONGOING, InitiativeStatus.UNDER_REVIEW])
        ).all()

        for initiative in active_initiatives:
            if initiative.due_date < now and initiative.status != InitiativeStatus.APPROVED:
                initiative.status = InitiativeStatus.OVERDUE
                self.db.add(initiative)
                stakeholders = [assignment.user for assignment in initiative.assignments]
                stakeholders.append(initiative.creator)
                self.notification_service.notify_initiative_overdue(initiative, stakeholders)

        self.db.commit()

    def can_submit_initiative(self, initiative_id: uuid.UUID) -> bool:
        """
        Check if initiative can be submitted (handles overdue blocking)
        """
        initiative = self.db.query(Initiative).filter(Initiative.id == initiative_id).first()
        if not initiative:
            return False

        if initiative.status == InitiativeStatus.OVERDUE:
            pending_extensions = self.db.query(InitiativeExtension).filter(
                and_(
                    InitiativeExtension.initiative_id == initiative_id,
                    InitiativeExtension.status == ExtensionStatus.PENDING
                )
            ).count()
            return pending_extensions == 0

        return initiative.status == InitiativeStatus.ONGOING

    def get_initiative_visibility(self, user: User, initiative_id: uuid.UUID) -> bool:
        """
        Check if user can see initiative based on involvement and permissions
        """
        initiative = self.db.query(Initiative).filter(Initiative.id == initiative_id).first()
        if not initiative:
            return False

        if initiative.created_by == user.id:
            return True

        assignment = self.db.query(InitiativeAssignment).filter(
            and_(InitiativeAssignment.initiative_id == initiative_id, InitiativeAssignment.user_id == user.id)
        ).first()
        if assignment:
            return True

        if initiative.type == InitiativeType.GROUP and initiative.team_head_id == user.id:
            return True

        if self.permission_service.user_has_permission(user, "initiative_view_all"):
            initiative_creator = self.db.query(User).filter(User.id == initiative.created_by).first()
            if initiative_creator:
                return self.permission_service.user_can_access_organization(user, initiative_creator.organization_id)

        return False

    def get_user_initiatives(self, user: User, status_filter: Optional[List[InitiativeStatus]] = None) -> List[Initiative]:
        """Get initiatives visible to user with optional status filtering"""
        base_query = self.db.query(Initiative)

        if status_filter:
            base_query = base_query.filter(Initiative.status.in_(status_filter))

        user_initiative_conditions = or_(
            Initiative.created_by == user.id,
            Initiative.assignments.any(InitiativeAssignment.user_id == user.id),
            and_(Initiative.type == InitiativeType.GROUP, Initiative.team_head_id == user.id)
        )

        initiatives = base_query.filter(user_initiative_conditions).all()

        if self.permission_service.user_has_permission(user, "initiative_view_all"):
            accessible_orgs = self.permission_service.get_accessible_organizations(user)
            additional_initiatives = base_query.join(User, Initiative.created_by == User.id).filter(
                User.organization_id.in_(accessible_orgs)
            ).all()

            initiative_ids = {initiative.id for initiative in initiatives}
            for initiative in additional_initiatives:
                if initiative.id not in initiative_ids:
                    initiatives.append(initiative)

        return initiatives
