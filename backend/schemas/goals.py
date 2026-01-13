from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from enum import Enum
import uuid

class GoalType(str, Enum):
    YEARLY = "YEARLY"
    QUARTERLY = "QUARTERLY"
    DEPARTMENTAL = "DEPARTMENTAL"  # NEW: Department/Directorate-specific goals
    INDIVIDUAL = "INDIVIDUAL"

class GoalStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    ACHIEVED = "ACHIEVED"
    DISCARDED = "DISCARDED"
    REJECTED = "REJECTED"

class Quarter(str, Enum):
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"

class GoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: GoalType
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    quarter: Optional[Quarter] = None  # Required for INDIVIDUAL goals
    year: Optional[int] = None  # Required for INDIVIDUAL goals
    organization_id: Optional[uuid.UUID] = None  # Required for DEPARTMENTAL goals

    @validator('start_date', 'end_date', pre=True)
    def empty_string_to_none(cls, v):
        # Convert empty strings to None for optional date fields
        if v == "" or v is None:
            return None
        return v

    @validator('end_date')
    def validate_dates(cls, v, values):
        # Only validate if both dates are provided
        if v and 'start_date' in values and values['start_date'] and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

    @validator('quarter')
    def validate_individual_quarter(cls, v, values):
        if 'type' in values and values['type'] == GoalType.INDIVIDUAL and not v:
            raise ValueError('Quarter is required for INDIVIDUAL goals')
        return v

    @validator('year')
    def validate_individual_year(cls, v, values):
        if 'type' in values and values['type'] == GoalType.INDIVIDUAL and not v:
            raise ValueError('Year is required for INDIVIDUAL goals')
        return v

class GoalCreate(GoalBase):
    parent_goal_id: Optional[uuid.UUID] = None
    owner_id: Optional[uuid.UUID] = None  # For INDIVIDUAL goals (if creating for someone else)

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @validator('start_date', 'end_date', pre=True)
    def empty_string_to_none(cls, v):
        # Convert empty strings to None for optional date fields
        if v == "" or v is None:
            return None
        return v

class GoalProgressUpdate(BaseModel):
    new_percentage: int = Field(..., ge=0, le=100)
    report: str = Field(..., min_length=1)

class GoalStatusUpdate(BaseModel):
    status: GoalStatus

class GoalInDB(GoalBase):
    id: uuid.UUID
    progress_percentage: int = 0
    status: GoalStatus = GoalStatus.ACTIVE
    parent_goal_id: Optional[uuid.UUID] = None
    created_by: uuid.UUID
    owner_id: Optional[uuid.UUID] = None
    organization_id: Optional[uuid.UUID] = None  # For DEPARTMENTAL goals
    frozen: bool = False
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[uuid.UUID] = None
    rejection_reason: Optional[str] = None
    achieved_at: Optional[datetime] = None
    discarded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Goal(GoalInDB):
    creator_name: Optional[str] = None
    owner_name: Optional[str] = None
    approver_name: Optional[str] = None
    parent_goal_title: Optional[str] = None
    child_count: Optional[int] = 0

class GoalWithChildren(Goal):
    children: List['GoalWithChildren'] = []

class GoalProgressReport(BaseModel):
    """Progress report entry for manual goal updates"""
    id: uuid.UUID
    old_percentage: Optional[int] = None
    new_percentage: int
    report: str
    updater_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GoalList(BaseModel):
    """Paginated goal list response"""
    goals: List[Goal]
    total: int
    page: int
    per_page: int

class GoalStats(BaseModel):
    """Goal statistics and analytics"""
    total_goals: int
    by_type: dict[str, int]
    by_status: dict[str, int]
    average_progress: float
    overdue_goals: int

class GoalApproval(BaseModel):
    """Approve or reject an individual goal"""
    approved: bool
    rejection_reason: Optional[str] = None

    @validator('rejection_reason')
    def validate_rejection_reason(cls, v, values):
        if 'approved' in values and not values['approved'] and not v:
            raise ValueError('Rejection reason is required when rejecting a goal')
        return v

class FreezeGoalsRequest(BaseModel):
    """Freeze all goals for a specific quarter"""
    quarter: Quarter
    year: int
    scheduled_unfreeze_date: Optional[datetime] = None  # When to auto-unfreeze

class UnfreezeGoalsRequest(BaseModel):
    """Unfreeze all goals for a specific quarter"""
    quarter: Quarter
    year: int
    is_emergency_override: bool = False
    emergency_reason: Optional[str] = None

    @validator('emergency_reason')
    def validate_emergency_reason(cls, v, values):
        if 'is_emergency_override' in values and values['is_emergency_override'] and not v:
            raise ValueError('Emergency reason is required for emergency overrides')
        return v

class FreezeGoalsResponse(BaseModel):
    """Response after freezing/unfreezing goals"""
    affected_count: int
    message: str

class GoalFreezeLog(BaseModel):
    """Freeze/unfreeze audit log entry"""
    id: uuid.UUID
    action: str
    quarter: Quarter
    year: int
    affected_goals_count: int
    scheduled_unfreeze_date: Optional[datetime]
    is_emergency_override: bool
    emergency_reason: Optional[str]
    performer_name: Optional[str]
    performed_at: datetime

    class Config:
        from_attributes = True

# Update forward references
GoalWithChildren.model_rebuild()