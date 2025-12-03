"""
Notification Schemas
Pydantic models for notification API requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from models import NotificationType, NotificationPriority


class NotificationBase(BaseModel):
    """Base notification schema"""
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.MEDIUM
    title: str = Field(..., max_length=255)
    message: str
    action_url: Optional[str] = Field(None, max_length=500)
    data: Optional[Dict[str, Any]] = None


class NotificationCreate(NotificationBase):
    """Schema for creating notifications"""
    user_id: UUID
    triggered_by: Optional[UUID] = None
    expires_at: Optional[datetime] = None


class NotificationUpdate(BaseModel):
    """Schema for updating notifications"""
    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    """Schema for notification responses"""
    id: UUID
    user_id: UUID
    triggered_by: Optional[UUID]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]

    # Triggered by user info
    triggered_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list"""
    notifications: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    per_page: int


class NotificationStats(BaseModel):
    """Statistics about user notifications"""
    total_count: int
    unread_count: int
    by_type: Dict[str, int]
    by_priority: Dict[str, int]
