"""
Authentication API Router
Based on CLAUDE.md specification with onboarding flow
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime

from database import get_db
from models import User, UserStatus
from schemas.auth import (
    LoginRequest, LoginResponse, OnboardingRequest,
    PasswordResetRequest, PasswordChangeRequest, UserSession
)
from utils.auth import (
    authenticate_user, create_access_token, get_current_user,
    verify_password, get_password_hash, generate_onboarding_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_role_version
)
from utils.permissions import UserPermissions

router = APIRouter(tags=["authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    User login with email and password
    Returns access token and user context
    """
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is not active"
        )

    # Create access token with role version for cache invalidation
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role_version": get_role_version(user)
        },
        expires_delta=access_token_expires
    )

    # Get user permissions
    permission_service = UserPermissions(db)
    user_perms = permission_service.get_user_effective_permissions(user)

    # Compute full name from separate fields
    name_parts = [user.first_name]
    if user.middle_name:
        name_parts.append(user.middle_name)
    name_parts.append(user.last_name)
    full_name = " ".join(name_parts)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": str(user.id),
            "email": user.email,
            "name": full_name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "middle_name": user.middle_name,
            "organization_name": user.organization.name,
            "role_name": user.role.name,
            "status": user.status.value
        },
        permissions=user_perms["permissions"],
        scope=user_perms["effective_scope"]
    )

@router.post("/logout")
async def logout(current_user: UserSession = Depends(get_current_user)):
    """
    User logout - invalidate session
    In a more complete implementation, this would blacklist the token
    """
    return {"message": "Successfully logged out"}

@router.post("/onboard")
async def onboard_user(
    onboarding_data: OnboardingRequest,
    db: Session = Depends(get_db)
):
    """
    Token-based first-time user setup
    Users receive email with secure token → set password → gain system access
    """
    user = db.query(User).filter(User.onboarding_token == onboarding_data.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired onboarding token"
        )

    # Check if token has expired
    if user.onboarding_token_expires_at and user.onboarding_token_expires_at < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Onboarding token has expired. Please contact your administrator to resend the onboarding link."
        )

    if user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has already been onboarded"
        )

    # Set password and clear onboarding token
    user.password_hash = get_password_hash(onboarding_data.password)
    user.onboarding_token = None
    user.onboarding_token_expires_at = None
    user.email_verified_at = datetime.now()
    user.status = UserStatus.ACTIVE

    db.commit()

    return {"message": "User successfully onboarded"}

@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Password reset via email
    Generates new onboarding token and sends email
    """
    user = db.query(User).filter(User.email == reset_data.email).first()
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If the email exists, a reset link has been sent"}

    # Generate new onboarding token with 7-day expiration
    user.onboarding_token = generate_onboarding_token()
    user.onboarding_token_expires_at = datetime.now() + timedelta(days=7)
    db.commit()

    # Send password reset email
    from utils.notifications import NotificationService
    notification_service = NotificationService(db)
    notification_service.notify_password_reset(user, user.onboarding_token)

    return {"message": "If the email exists, a reset link has been sent"}

@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated user
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Update password
    user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}

@router.get("/me", response_model=UserSession)
async def get_current_user_info(current_user: UserSession = Depends(get_current_user)):
    """
    Get current user session information
    """
    return current_user

@router.get("/session", response_model=UserSession)
async def get_session_data(current_user: UserSession = Depends(get_current_user)):
    """
    Get complete session data for localStorage storage
    This endpoint provides all user context including permissions
    """
    return current_user

@router.post("/refresh")
async def refresh_token(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refresh access token with updated role version
    """
    # Get fresh user data for role version
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create new access token with current role version
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(current_user.user_id),
            "role_version": get_role_version(user)
        },
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }