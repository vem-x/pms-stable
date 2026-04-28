from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from decouple import config
import uuid
import secrets
import string

from database import get_db
from models import User, UserStatus, RefreshToken
from schemas.auth import UserSession
from utils.permissions import UserPermissions

SECRET_KEY = config("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour for access tokens
REFRESH_TOKEN_EXPIRE_DAYS = 7  # 7 days for refresh tokens

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token with minimal payload for cookie storage"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    # Keep JWT payload minimal to avoid cookie size issues
    minimal_payload = {
        "sub": data.get("sub"),  # user_id
        "exp": expire,
        "role_version": data.get("role_version", 1)  # for cache invalidation
    }

    encoded_jwt = jwt.encode(minimal_payload, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user by email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def generate_onboarding_token() -> str:
    """Generate secure onboarding token"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))

def get_role_version(user: User) -> int:
    """Get role version for cache invalidation"""
    # This would be updated whenever role permissions change
    # For now, use role updated_at timestamp as version
    if user.role and getattr(user.role, 'updated_at', None):
        return int(user.role.updated_at.timestamp())
    return 1


def generate_refresh_token() -> str:
    """Generate a secure random refresh token"""
    return secrets.token_urlsafe(64)


def create_refresh_token(
    db: Session,
    user_id: uuid.UUID,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None
) -> RefreshToken:
    """Create a new refresh token and store it in the database"""
    token = generate_refresh_token()
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    refresh_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address
    )
    db.add(refresh_token)
    db.commit()
    db.refresh(refresh_token)

    return refresh_token


def validate_refresh_token(db: Session, token: str) -> Optional[RefreshToken]:
    """Validate a refresh token and return it if valid"""
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.revoked == False
    ).first()

    if not refresh_token:
        return None

    # Check if token has expired
    if refresh_token.expires_at < datetime.utcnow():
        return None

    return refresh_token


def revoke_refresh_token(db: Session, token: str) -> bool:
    """Revoke a refresh token"""
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token == token
    ).first()

    if refresh_token:
        refresh_token.revoked = True
        refresh_token.revoked_at = datetime.utcnow()
        db.commit()
        return True
    return False


def revoke_all_user_refresh_tokens(db: Session, user_id: uuid.UUID) -> int:
    """Revoke all refresh tokens for a user (logout from all devices)"""
    count = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked == False
    ).update({
        "revoked": True,
        "revoked_at": datetime.utcnow()
    })
    db.commit()
    return count


def cleanup_expired_tokens(db: Session) -> int:
    """Remove expired and revoked tokens from database (for maintenance)"""
    count = db.query(RefreshToken).filter(
        (RefreshToken.expires_at < datetime.utcnow()) |
        (RefreshToken.revoked == True)
    ).delete()
    db.commit()
    return count


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserSession:
    """
    Get current user from JWT token
    Returns UserSession with complete user context
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Get user with full context
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if user is None:
        raise credentials_exception

    # Check if user is active
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is not active"
        )

    # Calculate effective permissions
    permission_service = UserPermissions(db)
    user_perms = permission_service.get_user_effective_permissions(user)

    # Compute full name from separate fields
    name_parts = [user.first_name]
    if user.middle_name:
        name_parts.append(user.middle_name)
    name_parts.append(user.last_name)
    full_name = " ".join(name_parts)

    # Compute profile_image_url from profile_image_path
    profile_image_url = None
    if user.profile_image_path:
        # Convert Windows path to URL-friendly format
        path = user.profile_image_path.replace('\\', '/')
        profile_image_url = f"/api/{path}"

    return UserSession(
        user_id=user.id,
        email=user.email,
        name=full_name,
        first_name=user.first_name,
        last_name=user.last_name,
        middle_name=user.middle_name,
        phone=user.phone,
        address=user.address,
        skillset=user.skillset,
        level=user.level,
        job_title=user.job_title,
        organization_id=user.organization_id,
        organization_name=user.organization.name,
        role_id=user.role_id,
        role_name=user.role.name,
        permissions=user_perms["permissions"],
        scope_override=user.role.scope_override.value,
        effective_scope=user_perms["effective_scope"],
        is_leadership=user_perms["is_leadership"],
        status=user.status.value,
        profile_image_path=user.profile_image_path,
        profile_image_url=profile_image_url
    )

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user if they are active"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_superuser(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current user if they are a superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def check_permission(user: User, permission: str) -> bool:
    """Check if user has a specific permission"""
    if user.is_superuser:
        return True

    if not user.role:
        return False

    user_permissions = user.role.permissions or []
    return permission in user_permissions

def require_permission(permission: str):
    """Dependency to require a specific permission"""
    def permission_checker(current_user: User = Depends(get_current_active_user)):
        if not check_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission}"
            )
        return current_user
    return permission_checker

def require_permissions(permissions: List[str]):
    """Dependency to require multiple permissions (user must have ALL)"""
    def permissions_checker(current_user: User = Depends(get_current_active_user)):
        for permission in permissions:
            if not check_permission(current_user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission required: {permission}"
                )
        return current_user
    return permissions_checker

def require_any_permission(permissions: List[str]):
    """Dependency to require any of the listed permissions (user must have at least ONE)"""
    def any_permission_checker(current_user: User = Depends(get_current_active_user)):
        for permission in permissions:
            if check_permission(current_user, permission):
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"One of these permissions required: {', '.join(permissions)}"
        )
    return any_permission_checker