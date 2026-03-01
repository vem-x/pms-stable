"""
Pydantic schemas for Review System
Handles review cycles, individual reviews, and peer review data structures
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from models import ReviewCycleStatus, ReviewStatus, ReviewType

# Review Cycle Schemas
class ReviewCycleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., description="quarterly, annual, probationary, project")
    period: str = Field(..., description="Q1-2024, FY-2024, etc.")
    start_date: datetime
    end_date: datetime

class ReviewCycleCreate(ReviewCycleBase):
    phase_schedule: Dict[str, Any] = Field(default_factory=dict)
    buffer_time: str = Field(default='1_week')
    target_population: Optional[Dict[str, Any]] = None
    inclusion_criteria: Optional[Dict[str, Any]] = None
    exclusion_criteria: Optional[Dict[str, Any]] = None
    mandatory_participants: Optional[List[str]] = None
    components: Dict[str, Any] = Field(default_factory=dict)
    ai_assistance: Optional[Dict[str, Any]] = None
    calibration_sessions: Optional[Dict[str, Any]] = None
    approval_workflow: Optional[Dict[str, Any]] = None

class ReviewCycleUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    period: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    phase_schedule: Optional[Dict[str, Any]] = None
    buffer_time: Optional[str] = None
    target_population: Optional[Dict[str, Any]] = None
    components: Optional[Dict[str, Any]] = None
    status: Optional[ReviewCycleStatus] = None

class ReviewCycleResponse(ReviewCycleBase):
    id: str
    phase_schedule: Dict[str, Any]
    buffer_time: str
    target_population: Optional[Dict[str, Any]]
    components: Dict[str, Any]
    status: ReviewCycleStatus
    created_by: str
    participants_count: int
    completion_rate: float
    quality_score: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Individual Review Schemas
class ReviewBase(BaseModel):
    type: ReviewType
    cycle_id: str
    reviewee_id: str

class ReviewCreate(ReviewBase):
    reviewer_id: Optional[str] = None  # Null for self-reviews

class ReviewUpdate(BaseModel):
    responses: Optional[Dict[str, Any]] = None
    completion_percentage: Optional[float] = Field(None, ge=0, le=100)
    status: Optional[ReviewStatus] = None

class ReviewResponse(ReviewBase):
    id: str
    reviewer_id: Optional[str]
    responses: Optional[Dict[str, Any]]
    completion_percentage: float
    time_spent: int
    ai_insights: Optional[Dict[str, Any]]
    status: ReviewStatus
    deadline: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]

    class Config:
        from_attributes = True

# Response Schemas for Complex Operations
class ReviewCycleParticipants(BaseModel):
    cycle_id: str
    participants: List[Dict[str, Any]]
    total_count: int

class ReviewAssignment(BaseModel):
    review_id: str
    reviewee: Dict[str, Any]
    reviewer: Optional[Dict[str, Any]]
    type: ReviewType
    status: ReviewStatus
    deadline: Optional[datetime]

class ReviewSubmission(BaseModel):
    responses: Dict[str, Any]
    time_spent: Optional[int] = 0
    comments: Optional[str] = None

# Analytics Schemas
class CycleAnalytics(BaseModel):
    cycle_id: str
    total_reviews: int
    completed_reviews: int
    completion_rate: float
    average_completion_time: float
    status_distribution: Dict[str, int]
    rating_distribution: Dict[str, int]
    department_breakdown: Dict[str, Dict[str, Any]]

class ReviewInsights(BaseModel):
    review_id: str
    ai_generated_insights: Dict[str, Any]
    performance_highlights: List[str]
    development_areas: List[str]
    recommended_actions: List[str]
    confidence_score: float