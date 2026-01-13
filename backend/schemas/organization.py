from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

class OrganizationLevel(str, Enum):
    GLOBAL = "GLOBAL"
    DIRECTORATE = "DIRECTORATE"
    DEPARTMENT = "DEPARTMENT"
    DIVISION = "DIVISION"
    UNIT = "UNIT"

class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    level: OrganizationLevel

class OrganizationCreate(OrganizationBase):
    parent_id: Optional[uuid.UUID] = None

    @validator('parent_id')
    def validate_parent_for_level(cls, v, values):
        if 'level' in values:
            if values['level'] == OrganizationLevel.GLOBAL and v is not None:
                raise ValueError('Global organization cannot have a parent')
            if values['level'] != OrganizationLevel.GLOBAL and v is None:
                raise ValueError('Non-global organizations must have a parent')
        return v

class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

class OrganizationInDB(OrganizationBase):
    id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Organization(OrganizationInDB):
    user_count: Optional[int] = 0
    child_count: Optional[int] = 0

class OrganizationWithChildren(Organization):
    children: List['OrganizationWithChildren'] = []

class OrganizationTree(BaseModel):
    """Complete organizational hierarchy tree"""
    organization: OrganizationWithChildren

class OrganizationStats(BaseModel):
    """Statistical information about organizational structure"""
    total_organizations: int
    by_level: dict[str, int]
    total_users: int
    users_by_level: dict[str, int]

# Update forward references
OrganizationWithChildren.model_rebuild()