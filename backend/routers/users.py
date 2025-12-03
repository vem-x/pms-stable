"""
User Management API Router
Based on CLAUDE.md specification with comprehensive user management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
import shutil
from pathlib import Path

from database import get_db
from models import User, UserStatus, UserHistory
from schemas.users import (
    UserCreate, UserUpdate, UserStatusUpdate, User as UserSchema,
    UserWithRelations, UserProfile, UserHistoryEntry, UserList
)
from schemas.auth import UserSession
from utils.auth import get_current_user, get_password_hash, generate_onboarding_token
from utils.permissions import UserPermissions, SystemPermissions

router = APIRouter(tags=["users"])

def get_permission_service(db: Session = Depends(get_db)) -> UserPermissions:
    return UserPermissions(db)

def enhance_user_with_supervisor(user: User, db: Session) -> dict:
    """Helper function to add supervisor information to user object"""
    user_dict = UserSchema.from_orm(user).dict()
    if user.supervisor_id:
        supervisor = db.query(User).filter(User.id == user.supervisor_id).first()
        if supervisor:
            user_dict['supervisor_name'] = f"{supervisor.first_name} {supervisor.last_name}"
    return user_dict

@router.get("/", response_model=UserList)
async def get_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    status_filter: Optional[UserStatus] = None,
    organization_id: Optional[uuid.UUID] = None,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    List users with scope filtering
    Users only see other users within their organizational reach
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get accessible organizations
    accessible_org_ids = permission_service.get_accessible_organizations(user)

    # Build query
    query = db.query(User).filter(User.organization_id.in_(accessible_org_ids))

    # Apply filters
    if status_filter:
        query = query.filter(User.status == status_filter)

    if organization_id:
        if organization_id not in accessible_org_ids:
            raise HTTPException(status_code=403, detail="Cannot access users in this organization")
        query = query.filter(User.organization_id == organization_id)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * per_page
    users = query.offset(offset).limit(per_page).all()

    # Enhance users with supervisor names
    enhanced_users = [UserSchema(**enhance_user_with_supervisor(user, db)) for user in users]

    return UserList(
        users=enhanced_users,
        total=total,
        page=page,
        per_page=per_page
    )

@router.post("/", response_model=UserSchema)
async def create_user(
    user_data: UserCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Create new user and send onboarding email
    Requires USER_CREATE permission and scope access
    """
    creator = db.query(User).filter(User.id == current_user.user_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")

    if not permission_service.user_has_permission(creator, SystemPermissions.USER_CREATE):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Validate scope access to target organization
    if not permission_service.user_can_access_organization(creator, user_data.organization_id):
        raise HTTPException(status_code=403, detail="Cannot create user in this organization")

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate onboarding token
    onboarding_token = generate_onboarding_token()

    # Compute full name from separate fields
    name_parts = [user_data.first_name]
    if user_data.middle_name:
        name_parts.append(user_data.middle_name)
    name_parts.append(user_data.last_name)
    full_name = " ".join(name_parts)

    # Create user
    user = User(
        email=user_data.email,
        name=full_name,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        middle_name=user_data.middle_name,
        phone=user_data.phone,
        address=user_data.address,
        skillset=user_data.skillset,
        level=user_data.level,
        job_title=user_data.job_title,
        status=user_data.status,
        organization_id=user_data.organization_id,
        role_id=user_data.role_id,
        supervisor_id=user_data.supervisor_id,
        onboarding_token=onboarding_token,
        password_hash=None  # Will be set during onboarding
    )

    db.add(user)
    db.flush()  # Get user ID

    # Create history entry
    history = UserHistory(
        user_id=user.id,
        admin_id=creator.id,
        action="user_created",
        old_value=None,
        new_value={
            "email": user_data.email,
            "name": full_name,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "middle_name": user_data.middle_name,
            "organization_id": str(user_data.organization_id),
            "role_id": str(user_data.role_id)
        }
    )
    db.add(history)

    db.commit()
    db.refresh(user)

    # Send onboarding email
    from utils.notifications import NotificationService
    notification_service = NotificationService(db)
    notification_service.notify_user_created(user, onboarding_token)

    return UserSchema(**enhance_user_with_supervisor(user, db))

# Self-service user endpoints (must be defined before /{user_id} routes)
@router.get("/me", response_model=UserWithRelations)
async def get_my_profile(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's complete profile
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserWithRelations(
        **user.__dict__,
        organization={
            "id": str(user.organization.id),
            "name": user.organization.name,
            "level": user.organization.level.value
        },
        role={
            "id": str(user.role.id),
            "name": user.role.name,
            "permissions": user.role.permissions
        }
    )

@router.put("/me", response_model=UserSchema)
async def update_my_profile(
    profile_data: UserProfile,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Self-edit limited profile fields
    Users can only change non-critical fields
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update allowed fields only
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    # Create history entry
    history = UserHistory(
        user_id=user.id,
        admin_id=user.id,  # Self-update
        action="self_profile_update",
        old_value=None,
        new_value=update_data
    )
    db.add(history)

    db.commit()
    db.refresh(user)

    return UserSchema(**enhance_user_with_supervisor(user, db))

@router.post("/me/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload profile image for current user
    Stores file locally in uploads/profiles/ directory
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")

    # Validate file size (max 5MB)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must not exceed 5MB")

    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/profiles")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = upload_dir / unique_filename

    # Delete old profile image if exists
    if user.profile_image_path:
        old_file_path = Path(user.profile_image_path)
        if old_file_path.exists():
            old_file_path.unlink()

    # Save new file
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update user record with the path
    user.profile_image_path = str(file_path)

    # Create history entry
    history = UserHistory(
        user_id=user.id,
        admin_id=user.id,
        action="profile_image_updated",
        old_value=None,
        new_value={"profile_image_path": str(file_path)}
    )
    db.add(history)

    # Commit changes to database
    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        # Rollback on error and delete uploaded file
        db.rollback()
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to save profile image: {str(e)}")

    # Generate URL path for the uploaded image
    url_path = f"/api/uploads/profiles/{unique_filename}"

    return {
        "message": "Profile image uploaded successfully",
        "profile_image_path": str(file_path),
        "profile_image_url": url_path
    }

@router.delete("/me/profile-image")
async def delete_profile_image(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete profile image for current user
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.profile_image_path:
        raise HTTPException(status_code=404, detail="No profile image to delete")

    # Delete file
    file_path = Path(user.profile_image_path)
    if file_path.exists():
        file_path.unlink()

    # Update user record
    user.profile_image_path = None

    # Create history entry
    history = UserHistory(
        user_id=user.id,
        admin_id=user.id,
        action="profile_image_deleted",
        old_value=None,
        new_value=None
    )
    db.add(history)

    db.commit()

    return {"message": "Profile image deleted successfully"}

@router.get("/{user_id}", response_model=UserWithRelations)
async def get_user(
    user_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Get user details with full relations
    Requires scope access to user's organization
    """
    requester = db.query(User).filter(User.id == current_user.user_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check scope access
    if not permission_service.user_can_access_organization(requester, user.organization_id):
        raise HTTPException(status_code=403, detail="Cannot access this user")

    # Get supervisees
    supervisees = db.query(User).filter(User.supervisor_id == user.id).all()
    supervisees_list = [UserSchema(**enhance_user_with_supervisor(supervisee, db)) for supervisee in supervisees]

    return UserWithRelations(
        **user.__dict__,
        organization={
            "id": str(user.organization.id),
            "name": user.organization.name,
            "level": user.organization.level.value
        },
        role={
            "id": str(user.role.id),
            "name": user.role.name,
            "permissions": user.role.permissions
        },
        supervisees=supervisees_list
    )

@router.get("/me/supervisees", response_model=List[UserSchema])
async def get_my_supervisees(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of users supervised by the current user
    Returns all users where supervisor_id equals current user's ID
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all supervisees
    supervisees = db.query(User).filter(User.supervisor_id == user.id).all()

    # Enhance with supervisor information
    enhanced_supervisees = [UserSchema(**enhance_user_with_supervisor(supervisee, db)) for supervisee in supervisees]

    return enhanced_supervisees

@router.get("/{user_id}/supervisees", response_model=List[UserSchema])
async def get_user_supervisees(
    user_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Get list of users supervised by a specific user
    Requires scope access to the user's organization
    """
    requester = db.query(User).filter(User.id == current_user.user_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check scope access
    if not permission_service.user_can_access_organization(requester, user.organization_id):
        raise HTTPException(status_code=403, detail="Cannot access this user")

    # Get all supervisees
    supervisees = db.query(User).filter(User.supervisor_id == user.id).all()

    # Enhance with supervisor information
    enhanced_supervisees = [UserSchema(**enhance_user_with_supervisor(supervisee, db)) for supervisee in supervisees]

    return enhanced_supervisees

@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: uuid.UUID,
    user_data: UserUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Update user profile
    Requires USER_EDIT permission and scope access
    """
    updater = db.query(User).filter(User.id == current_user.user_id).first()
    if not updater:
        raise HTTPException(status_code=404, detail="Updater not found")

    if not permission_service.user_has_permission(updater, SystemPermissions.USER_EDIT):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check scope access
    if not permission_service.user_can_access_organization(updater, user.organization_id):
        raise HTTPException(status_code=403, detail="Cannot access this user")

    # Compute full name from separate fields for history
    name_parts = [user.first_name]
    if user.middle_name:
        name_parts.append(user.middle_name)
    name_parts.append(user.last_name)
    full_name = " ".join(name_parts)

    # Store old values for history
    old_values = {
        "name": full_name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "middle_name": user.middle_name,
        "phone": user.phone,
        "address": user.address,
        "skillset": user.skillset,
        "level": user.level,
        "job_title": user.job_title,
        "organization_id": str(user.organization_id) if user.organization_id else None,
        "role_id": str(user.role_id) if user.role_id else None
    }

    # Update fields
    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "organization_id" and value:
            # Validate scope access to new organization
            if not permission_service.user_can_access_organization(updater, value):
                raise HTTPException(status_code=403, detail="Cannot assign user to this organization")

        setattr(user, field, value)

    # Create history entry
    new_values = {field: str(value) if isinstance(value, uuid.UUID) else value
                  for field, value in update_data.items()}

    history = UserHistory(
        user_id=user.id,
        admin_id=updater.id,
        action="profile_updated",
        old_value=old_values,
        new_value=new_values
    )
    db.add(history)

    db.commit()
    db.refresh(user)

    return UserSchema(**enhance_user_with_supervisor(user, db))

@router.put("/{user_id}/status", response_model=UserSchema)
async def update_user_status(
    user_id: uuid.UUID,
    status_data: UserStatusUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Change user status (active/suspended/etc)
    Status changes affect task assignment availability
    """
    updater = db.query(User).filter(User.id == current_user.user_id).first()
    if not updater:
        raise HTTPException(status_code=404, detail="Updater not found")

    # Check permissions based on status change
    required_permission = None
    if status_data.status == UserStatus.SUSPENDED:
        required_permission = SystemPermissions.USER_SUSPEND
    elif status_data.status == UserStatus.ACTIVE:
        required_permission = SystemPermissions.USER_ACTIVATE
    elif status_data.status == UserStatus.ARCHIVED:
        required_permission = SystemPermissions.USER_ARCHIVE

    if required_permission and not permission_service.user_has_permission(updater, required_permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check scope access
    if not permission_service.user_can_access_organization(updater, user.organization_id):
        raise HTTPException(status_code=403, detail="Cannot access this user")

    old_status = user.status
    user.status = status_data.status

    # Create history entry
    history = UserHistory(
        user_id=user.id,
        admin_id=updater.id,
        action="status_changed",
        old_value={"status": old_status.value},
        new_value={"status": status_data.status.value}
    )
    db.add(history)

    db.commit()
    db.refresh(user)

    # TODO: Send notifications about status change

    return UserSchema(**enhance_user_with_supervisor(user, db))

@router.get("/{user_id}/history", response_model=List[UserHistoryEntry])
async def get_user_history(
    user_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    View user change history
    Requires USER_HISTORY_VIEW permission
    """
    requester = db.query(User).filter(User.id == current_user.user_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    if not permission_service.user_has_permission(requester, SystemPermissions.USER_HISTORY_VIEW):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check scope access
    if not permission_service.user_can_access_organization(requester, user.organization_id):
        raise HTTPException(status_code=403, detail="Cannot access this user")

    history_entries = db.query(UserHistory).filter(UserHistory.user_id == user_id)\
                        .order_by(UserHistory.created_at.desc()).all()

    return [
        UserHistoryEntry(
            **entry.__dict__,
            admin_name=entry.admin.name if entry.admin else "System"
        )
        for entry in history_entries
    ]

@router.get("/{user_id}/potential-supervisors", response_model=List[UserSchema])
async def get_potential_supervisors(
    user_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Get list of potential supervisors for a user
    Supervisors must be in same department and have higher level
    """
    requester = db.query(User).filter(User.id == current_user.user_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    if not permission_service.user_has_permission(requester, SystemPermissions.USER_EDIT):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check scope access
    if not permission_service.user_can_access_organization(requester, user.organization_id):
        raise HTTPException(status_code=403, detail="Cannot access this user")

    # Find potential supervisors: same department, higher level, active status
    potential_supervisors = db.query(User).filter(
        User.organization_id == user.organization_id,
        User.level > user.level if user.level else True,
        User.status == UserStatus.ACTIVE,
        User.id != user.id  # Can't supervise themselves
    ).all()

    return [UserSchema.from_orm(supervisor) for supervisor in potential_supervisors]

@router.put("/{user_id}/supervisor", response_model=UserSchema)
async def assign_supervisor(
    user_id: uuid.UUID,
    supervisor_data: dict,  # {"supervisor_id": "uuid"}
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Assign or change supervisor for a user
    Supervisor must be in same department with higher level
    """
    requester = db.query(User).filter(User.id == current_user.user_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    if not permission_service.user_has_permission(requester, SystemPermissions.USER_EDIT):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check scope access
    if not permission_service.user_can_access_organization(requester, user.organization_id):
        raise HTTPException(status_code=403, detail="Cannot access this user")

    supervisor_id = supervisor_data.get('supervisor_id')

    # If removing supervisor
    if supervisor_id is None:
        old_supervisor_id = user.supervisor_id
        user.supervisor_id = None

        # Create history entry
        history = UserHistory(
            user_id=user.id,
            admin_id=requester.id,
            action="supervisor_removed",
            old_value={"supervisor_id": str(old_supervisor_id) if old_supervisor_id else None},
            new_value={"supervisor_id": None}
        )
        db.add(history)

    else:
        # Validate supervisor
        supervisor = db.query(User).filter(User.id == supervisor_id).first()
        if not supervisor:
            raise HTTPException(status_code=404, detail="Supervisor not found")

        # Validate supervisor constraints
        if supervisor.organization_id != user.organization_id:
            raise HTTPException(status_code=400, detail="Supervisor must be in same department")

        if user.level and supervisor.level and supervisor.level <= user.level:
            raise HTTPException(status_code=400, detail="Supervisor must have higher level")

        if supervisor.status != UserStatus.ACTIVE:
            raise HTTPException(status_code=400, detail="Supervisor must be active")

        if supervisor_id == user_id:
            raise HTTPException(status_code=400, detail="User cannot supervise themselves")

        old_supervisor_id = user.supervisor_id
        user.supervisor_id = supervisor_id

        # Create history entry
        history = UserHistory(
            user_id=user.id,
            admin_id=requester.id,
            action="supervisor_assigned",
            old_value={"supervisor_id": str(old_supervisor_id) if old_supervisor_id else None},
            new_value={"supervisor_id": str(supervisor_id)}
        )
        db.add(history)

    db.commit()
    db.refresh(user)

    return UserSchema(**enhance_user_with_supervisor(user, db))

