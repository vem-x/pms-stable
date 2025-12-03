from pydantic import BaseModel, Field, EmailStr, validator, model_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

class UserStatus(str, Enum):
    PENDING_ACTIVATION = "pending_activation"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    ON_LEAVE = "on_leave"
    ARCHIVED = "archived"

class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    skillset: Optional[str] = None
    level: Optional[int] = Field(None, ge=1, le=17)  # Civil service grade levels 1-17
    job_title: Optional[str] = Field(None, max_length=255)
    status: UserStatus = UserStatus.PENDING_ACTIVATION

class UserCreate(UserBase):
    organization_id: uuid.UUID
    role_id: uuid.UUID
    supervisor_id: Optional[uuid.UUID] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    skillset: Optional[str] = None
    level: Optional[int] = Field(None, ge=1, le=17)
    job_title: Optional[str] = Field(None, max_length=255)
    organization_id: Optional[uuid.UUID] = None
    role_id: Optional[uuid.UUID] = None
    supervisor_id: Optional[uuid.UUID] = None

class UserStatusUpdate(BaseModel):
    status: UserStatus

class UserInDB(UserBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    role_id: uuid.UUID
    email_verified_at: Optional[datetime] = None
    onboarding_token: Optional[str] = None
    profile_image_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDB):
    organization_name: Optional[str] = None
    role_name: Optional[str] = None
    name: Optional[str] = None  # Computed field for backward compatibility
    supervisor_id: Optional[uuid.UUID] = None
    supervisor_name: Optional[str] = None
    profile_image_url: Optional[str] = None  # Computed field for frontend access

    @model_validator(mode='before')
    @classmethod
    def compute_name(cls, values):
        """Compute full name from separate fields"""
        if isinstance(values, dict):
            if 'first_name' in values and 'last_name' in values:
                names = [values.get('first_name')]
                if values.get('middle_name'):
                    names.append(values.get('middle_name'))
                names.append(values.get('last_name'))
                values['name'] = " ".join(names)

            # Compute profile_image_url from profile_image_path
            if values.get('profile_image_path'):
                # Convert Windows path to URL-friendly format
                path = values['profile_image_path'].replace('\\', '/')
                # Remove 'uploads/' prefix if present since we'll add /api/uploads/
                if path.startswith('uploads/'):
                    path = path[8:]  # Remove 'uploads/' prefix
                values['profile_image_url'] = f"/api/uploads/{path}"
        return values

class UserWithRelations(User):
    """User with full organizational and role information"""
    organization: Optional[dict] = None
    role: Optional[dict] = None
    supervisees: Optional[List['User']] = []  # List of users this user supervises

class UserProfile(BaseModel):
    """User's self-editable profile fields"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    skillset: Optional[str] = None

class UserOnboardingRequest(BaseModel):
    """Token-based user onboarding"""
    token: str
    password: str = Field(..., min_length=8)

class UserPasswordReset(BaseModel):
    email: EmailStr

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserHistoryEntry(BaseModel):
    """Audit trail entry for user changes"""
    id: uuid.UUID
    action: str
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    admin_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserList(BaseModel):
    """Paginated user list response"""
    users: List[User]
    total: int
    page: int
    per_page: int