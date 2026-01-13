from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

class InitiativeType(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    GROUP = "GROUP"

class InitiativeStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"  # Created by staff, waiting for supervisor approval
    ASSIGNED = "ASSIGNED"  # Supervisor created and assigned to me, waiting for acceptance
    PENDING = "PENDING"  # Accepted or approved, ready to start work
    ONGOING = "ONGOING"  # Actively working on the initiative
    UNDER_REVIEW = "UNDER_REVIEW"  # Submitted for supervisor review
    COMPLETED = "COMPLETED"  # Supervisor reviewed and approved with grade
    REJECTED = "REJECTED"  # Supervisor rejected during approval
    OVERDUE = "OVERDUE"  # Past due date

class InitiativeUrgency(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class ExtensionStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DENIED = "DENIED"

class InitiativeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: InitiativeType
    urgency: Optional[InitiativeUrgency] = InitiativeUrgency.MEDIUM
    due_date: datetime
    goal_id: Optional[uuid.UUID] = None

class InitiativeCreate(InitiativeBase):
    """
    Create initiative schema
    Staff can create for themselves or assign to supervisees
    Supervisors can assign to anyone in their scope
    """
    assignee_ids: List[uuid.UUID] = Field(..., min_items=1)
    team_head_id: Optional[uuid.UUID] = None
    document_ids: Optional[List[uuid.UUID]] = Field(default_factory=list)

    @validator('due_date')
    def validate_due_date(cls, v):
        if v <= datetime.now():
            raise ValueError('Due date must be in the future')
        return v

    @validator('team_head_id', pre=True)
    def validate_team_head_id(cls, v):
        # Convert empty string to None
        if v == "":
            return None
        return v

    @validator('team_head_id')
    def validate_team_head(cls, v, values):
        if 'type' in values and 'assignee_ids' in values:
            if values['type'] == InitiativeType.GROUP:
                if v is None:
                    raise ValueError('Group initiatives must have a team head')
                if v not in values['assignee_ids']:
                    raise ValueError('Team head must be selected from assigned group members')
            elif values['type'] == InitiativeType.INDIVIDUAL:
                if len(values['assignee_ids']) != 1:
                    raise ValueError('Individual initiatives must have exactly one assignee')
                if v is not None:
                    raise ValueError('Individual initiatives cannot have a team head')
        return v

class InitiativeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    urgency: Optional[InitiativeUrgency] = None
    due_date: Optional[datetime] = None

class InitiativeApproval(BaseModel):
    """Schema for supervisor approving/rejecting an initiative"""
    approved: bool
    rejection_reason: Optional[str] = None

    @validator('rejection_reason')
    def validate_rejection_reason(cls, v, values):
        if 'approved' in values and not values['approved'] and not v:
            raise ValueError('Rejection reason is required when rejecting an initiative')
        return v

class InitiativeStatusUpdate(BaseModel):
    status: InitiativeStatus

class InitiativeSubmission(BaseModel):
    report: str = Field(..., min_length=1)
    document_ids: Optional[List[uuid.UUID]] = []

class InitiativeReview(BaseModel):
    """Final review by supervisor after completion"""
    score: int = Field(..., ge=1, le=10)
    feedback: Optional[str] = None
    approved: bool = True

class InitiativeExtensionRequest(BaseModel):
    new_due_date: datetime
    reason: str = Field(..., min_length=1)

    @validator('new_due_date')
    def validate_new_due_date(cls, v):
        if v <= datetime.now():
            raise ValueError('New due date must be in the future')
        return v

class InitiativeExtensionReview(BaseModel):
    status: ExtensionStatus
    reason: Optional[str] = None

class InitiativeInDB(InitiativeBase):
    id: uuid.UUID
    status: InitiativeStatus = InitiativeStatus.PENDING_APPROVAL
    score: Optional[int] = None
    feedback: Optional[str] = None
    team_head_id: Optional[uuid.UUID] = None
    created_by: uuid.UUID
    assigned_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Initiative(InitiativeInDB):
    creator_name: Optional[str] = None
    assigner_name: Optional[str] = None
    team_head_name: Optional[str] = None
    goal_title: Optional[str] = None
    assignee_count: Optional[int] = 0
    submission_count: Optional[int] = 0
    document_count: Optional[int] = 0
    extension_count: Optional[int] = 0

class InitiativeAssignee(BaseModel):
    """Initiative assignment information"""
    user_id: uuid.UUID
    user_name: str
    user_email: str
    assigned_at: datetime

    class Config:
        from_attributes = True

class InitiativeWithAssignees(Initiative):
    assignments: List[InitiativeAssignee] = []

class InitiativeForReview(InitiativeWithAssignees):
    """Initiative with submission details for supervisor review"""
    submission: Optional['InitiativeSubmissionDetail'] = None

class InitiativeSubmissionDetail(BaseModel):
    """Initiative submission with documents"""
    id: uuid.UUID
    report: str
    submitted_by: uuid.UUID
    submitter_name: Optional[str] = None
    submitted_at: datetime
    documents: List[dict] = []

    class Config:
        from_attributes = True

class InitiativeDocument(BaseModel):
    """Initiative document attachment"""
    id: uuid.UUID
    file_name: str
    file_path: str
    uploaded_by: uuid.UUID
    uploader_name: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class InitiativeExtension(BaseModel):
    """Initiative extension request details"""
    id: uuid.UUID
    new_due_date: datetime
    reason: str
    status: ExtensionStatus
    requested_by: uuid.UUID
    requester_name: Optional[str] = None
    reviewed_by: Optional[uuid.UUID] = None
    reviewer_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InitiativeList(BaseModel):
    """Paginated initiative list response"""
    initiatives: List[InitiativeWithAssignees]
    total: int
    page: int
    per_page: int

class InitiativeStats(BaseModel):
    """Initiative statistics and analytics"""
    total_initiatives: int
    by_status: dict[str, int]
    by_type: dict[str, int]
    by_urgency: dict[str, int]
    overdue_initiatives: int
    pending_approval: int
    average_score: Optional[float] = None
    completion_rate: float

# Sub-task Schemas

class SubTaskBase(BaseModel):
    """Base schema for sub-tasks"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class SubTaskCreate(SubTaskBase):
    """Create sub-task schema"""
    pass

class SubTaskUpdate(BaseModel):
    """Update sub-task schema"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(pending|completed)$")

class SubTask(SubTaskBase):
    """Sub-task response schema"""
    id: uuid.UUID
    status: str
    sequence_order: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    initiative_id: uuid.UUID
    created_by: uuid.UUID

    class Config:
        from_attributes = True

class SubTaskReorder(BaseModel):
    """Reorder sub-tasks schema"""
    subtask_ids: List[uuid.UUID] = Field(..., min_items=1)
