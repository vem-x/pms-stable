"""
Permission system implementation with scope overrides
Based on CLAUDE.md specification for hierarchical access control
"""

from typing import List, Dict, Any, Optional
from enum import Enum
import uuid
from sqlalchemy.orm import Session
from models import User, Role, Organization, OrganizationLevel, ScopeOverride

# Complete permission definitions from CLAUDE.md
class SystemPermissions:
    """All system permissions organized by category"""

    # Organization Permissions
    ORGANIZATION_CREATE = "organization_create"
    ORGANIZATION_EDIT = "organization_edit"
    ORGANIZATION_DELETE = "organization_delete"
    ORGANIZATION_VIEW_ALL = "organization_view_all"

    # Role Management Permissions
    ROLE_CREATE = "role_create"
    ROLE_EDIT = "role_edit"
    ROLE_DELETE = "role_delete"
    ROLE_ASSIGN = "role_assign"
    ROLE_VIEW_ALL = "role_view_all"

    # User Management Permissions
    USER_CREATE = "user_create"
    USER_EDIT = "user_edit"
    USER_SUSPEND = "user_suspend"
    USER_ACTIVATE = "user_activate"
    USER_ARCHIVE = "user_archive"
    USER_VIEW_ALL = "user_view_all"
    USER_HISTORY_VIEW = "user_history_view"

    # Goal Management Permissions
    GOAL_CREATE_YEARLY = "goal_create_yearly"
    GOAL_CREATE_QUARTERLY = "goal_create_quarterly"
    GOAL_CREATE_DEPARTMENTAL = "goal_create_departmental"
    GOAL_EDIT = "goal_edit"
    GOAL_PROGRESS_UPDATE = "goal_progress_update"
    GOAL_STATUS_CHANGE = "goal_status_change"
    GOAL_VIEW_ALL = "goal_view_all"
    GOAL_APPROVE = "goal_approve"
    GOAL_FREEZE = "goal_freeze"

    INITIATIVE_CREATE = "initiative_create"
    INITIATIVE_ASSIGN = "initiative_assign"
    INITIATIVE_EDIT = "initiative_edit"
    INITIATIVE_REVIEW = "initiative_review"
    INITIATIVE_VIEW_ALL = "initiative_view_all"
    INITIATIVE_EXTEND_DEADLINE = "initiative_extend_deadline"
    INITIATIVE_DELETE = "initiative_delete"

    # Review & Performance Permissions
    REVIEW_CREATE_CYCLE = "review_create_cycle"
    REVIEW_EDIT_CYCLE = "review_edit_cycle"
    REVIEW_MANAGE_CYCLE = "review_manage_cycle"
    REVIEW_VIEW_ALL = "review_view_all"
    REVIEW_CONDUCT = "review_conduct"
    PERFORMANCE_VIEW_ALL = "performance_view_all"
    PERFORMANCE_EDIT = "performance_edit"

    # System Administration Permissions
    SYSTEM_ADMIN = "system_admin"
    REPORTS_GENERATE = "reports_generate"
    AUDIT_ACCESS = "audit_access"
    NOTIFICATION_MANAGE = "notification_manage"
    BACKUP_ACCESS = "backup_access"

class PermissionGroups:
    """Permission groups for easier role management"""

    @staticmethod
    def get_all_groups() -> Dict[str, Dict[str, Any]]:
        return {
            "organization": {
                "name": "Organization Management",
                "description": "Manage organizational structure and hierarchy",
                "permissions": [
                    SystemPermissions.ORGANIZATION_CREATE,
                    SystemPermissions.ORGANIZATION_EDIT,
                    SystemPermissions.ORGANIZATION_DELETE,
                    SystemPermissions.ORGANIZATION_VIEW_ALL,
                ]
            },
            "role_management": {
                "name": "Role Management",
                "description": "Create and manage user roles and permissions",
                "permissions": [
                    SystemPermissions.ROLE_CREATE,
                    SystemPermissions.ROLE_EDIT,
                    SystemPermissions.ROLE_DELETE,
                    SystemPermissions.ROLE_ASSIGN,
                    SystemPermissions.ROLE_VIEW_ALL,
                ]
            },
            "user_management": {
                "name": "User Management",
                "description": "Manage user accounts and profiles",
                "permissions": [
                    SystemPermissions.USER_CREATE,
                    SystemPermissions.USER_EDIT,
                    SystemPermissions.USER_SUSPEND,
                    SystemPermissions.USER_ACTIVATE,
                    SystemPermissions.USER_ARCHIVE,
                    SystemPermissions.USER_VIEW_ALL,
                    SystemPermissions.USER_HISTORY_VIEW,
                ]
            },
            "goal_management": {
                "name": "Goal Management",
                "description": "Create and manage organizational goals",
                "permissions": [
                    SystemPermissions.GOAL_CREATE_YEARLY,
                    SystemPermissions.GOAL_CREATE_QUARTERLY,
                    SystemPermissions.GOAL_CREATE_DEPARTMENTAL,
                    SystemPermissions.GOAL_EDIT,
                    SystemPermissions.GOAL_PROGRESS_UPDATE,
                    SystemPermissions.GOAL_STATUS_CHANGE,
                    SystemPermissions.GOAL_VIEW_ALL,
                    SystemPermissions.GOAL_APPROVE,
                    SystemPermissions.GOAL_FREEZE,
                ]
            },
            "task_management": {
                "name": "Initiative Management",
                "description": "Create and manage initiatives and assignments",
                "permissions": [
                    SystemPermissions.INITIATIVE_CREATE,
                    SystemPermissions.INITIATIVE_ASSIGN,
                    SystemPermissions.INITIATIVE_EDIT,
                    SystemPermissions.INITIATIVE_REVIEW,
                    SystemPermissions.INITIATIVE_VIEW_ALL,
                    SystemPermissions.INITIATIVE_EXTEND_DEADLINE,
                    SystemPermissions.INITIATIVE_DELETE,
                ]
            },
            "review_management": {
                "name": "Review Management",
                "description": "Manage performance review cycles and conduct reviews",
                "permissions": [
                    SystemPermissions.REVIEW_CREATE_CYCLE,
                    SystemPermissions.REVIEW_EDIT_CYCLE,
                    SystemPermissions.REVIEW_MANAGE_CYCLE,
                    SystemPermissions.REVIEW_VIEW_ALL,
                    SystemPermissions.REVIEW_CONDUCT,
                ]
            },
            "performance_management": {
                "name": "Performance Management",
                "description": "View and manage performance data and analytics",
                "permissions": [
                    SystemPermissions.PERFORMANCE_VIEW_ALL,
                    SystemPermissions.PERFORMANCE_EDIT,
                ]
            },
            "system_administration": {
                "name": "System Administration",
                "description": "Full system access and administration",
                "permissions": [
                    SystemPermissions.SYSTEM_ADMIN,
                    SystemPermissions.REPORTS_GENERATE,
                    SystemPermissions.AUDIT_ACCESS,
                    SystemPermissions.NOTIFICATION_MANAGE,
                    SystemPermissions.BACKUP_ACCESS,
                ]
            }
        ,"initiative_management": {
    "name": "Initiative Management",
    "description": "Create and manage initiatives and their execution workflows",
    "permissions": [
        SystemPermissions.INITIATIVE_CREATE,
        SystemPermissions.INITIATIVE_ASSIGN,
        SystemPermissions.INITIATIVE_EDIT,
        SystemPermissions.INITIATIVE_REVIEW,
        SystemPermissions.INITIATIVE_VIEW_ALL,
        SystemPermissions.INITIATIVE_EXTEND_DEADLINE,
        SystemPermissions.INITIATIVE_DELETE,
    ]
},
        }

class UserPermissions:
    """Calculate and validate user permissions with scope overrides"""

    def __init__(self, db: Session):
        self.db = db

    def get_user_effective_permissions(self, user: User) -> Dict[str, Any]:
        """
        Calculate user's effective permissions including scope overrides
        Based on CLAUDE.md permission system architecture
        """
        role_permissions = user.role.permissions or []
        base_scope = self._get_organizational_scope(user.organization_id)
        effective_scope = user.role.scope_override if user.role.scope_override != ScopeOverride.NONE else base_scope

        return {
            "permissions": role_permissions,
            "base_scope": base_scope,
            "effective_scope": effective_scope.value,
            "is_leadership": user.role.is_leadership,
            "organization_level": user.organization.level.value,
        }

    def _get_organizational_scope(self, organization_id: uuid.UUID) -> ScopeOverride:
        """Get base organizational scope for user"""
        org = self.db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            return ScopeOverride.NONE

        # Base scope is determined by organizational level
        if org.level == OrganizationLevel.GLOBAL:
            return ScopeOverride.GLOBAL
        elif org.level == OrganizationLevel.DIRECTORATE:
            return ScopeOverride.CROSS_DIRECTORATE
        else:
            return ScopeOverride.NONE

    def user_can_access_organization(self, user: User, target_org_id: uuid.UUID) -> bool:
        """
        Check if user can access specific organization based on scope
        Implementation of scope access logic from CLAUDE.md
        """
        user_perms = self.get_user_effective_permissions(user)
        effective_scope = user_perms["effective_scope"]

        if effective_scope == "global":
            return True
        elif effective_scope == "cross_directorate":
            return self._is_within_directorate_network(user.organization_id, target_org_id)
        else:
            return self._is_within_organizational_tree(user.organization_id, target_org_id)

    def _is_within_directorate_network(self, user_org_id: uuid.UUID, target_org_id: uuid.UUID) -> bool:
        """Check if target organization is within user's directorate network"""
        user_org = self.db.query(Organization).filter(Organization.id == user_org_id).first()
        target_org = self.db.query(Organization).filter(Organization.id == target_org_id).first()

        if not user_org or not target_org:
            return False

        # Get directorate level for both organizations
        user_directorate = self._get_parent_at_level(user_org, OrganizationLevel.DIRECTORATE)
        target_directorate = self._get_parent_at_level(target_org, OrganizationLevel.DIRECTORATE)

        return user_directorate and target_directorate and user_directorate.id == target_directorate.id

    def _is_within_organizational_tree(self, user_org_id: uuid.UUID, target_org_id: uuid.UUID) -> bool:
        """Check if target organization is within user's organizational tree"""
        if user_org_id == target_org_id:
            return True

        # Check if target is a descendant of user's organization
        return self._is_descendant(user_org_id, target_org_id)

    def _get_parent_at_level(self, org: Organization, level: OrganizationLevel) -> Optional[Organization]:
        """Get parent organization at specific level"""
        current = org
        while current:
            if current.level == level:
                return current
            if current.parent_id:
                current = self.db.query(Organization).filter(Organization.id == current.parent_id).first()
            else:
                break
        return None

    def _is_descendant(self, ancestor_id: uuid.UUID, descendant_id: uuid.UUID) -> bool:
        """Check if descendant_id is a descendant of ancestor_id"""
        current_id = descendant_id
        while current_id:
            if current_id == ancestor_id:
                return True
            org = self.db.query(Organization).filter(Organization.id == current_id).first()
            if org and org.parent_id:
                current_id = org.parent_id
            else:
                break
        return False

    def user_has_permission(self, user: User, permission: str) -> bool:
        """Check if user has specific permission"""
        user_perms = self.get_user_effective_permissions(user)
        return permission in user_perms["permissions"]

    def get_accessible_organizations(self, user: User) -> List[uuid.UUID]:
        """Get list of organization IDs user can access"""
        user_perms = self.get_user_effective_permissions(user)
        effective_scope = user_perms["effective_scope"]

        if effective_scope == "global":
            # User can access all organizations
            orgs = self.db.query(Organization).all()
            return [org.id for org in orgs]
        elif effective_scope == "cross_directorate":
            # User can access all organizations within their directorate
            user_org = self.db.query(Organization).filter(Organization.id == user.organization_id).first()
            directorate = self._get_parent_at_level(user_org, OrganizationLevel.DIRECTORATE)
            if directorate:
                return self._get_all_descendants(directorate.id)
            return [user.organization_id]
        else:
            # User can only access their organizational tree
            return self._get_all_descendants(user.organization_id)

    def _get_all_descendants(self, org_id: uuid.UUID) -> List[uuid.UUID]:
        """Get all descendant organization IDs"""
        descendants = [org_id]
        children = self.db.query(Organization).filter(Organization.parent_id == org_id).all()
        for child in children:
            descendants.extend(self._get_all_descendants(child.id))
        return descendants

def require_permission(permission: str):
    """Decorator to require specific permission for endpoint access"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # This would be implemented with FastAPI dependency injection
            # For now, this is a placeholder for the decorator structure
            return func(*args, **kwargs)
        return wrapper
    return decorator

def require_scope_access(target_org_id_param: str):
    """Decorator to require scope access to specific organization"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # This would be implemented with FastAPI dependency injection
            # For now, this is a placeholder for the decorator structure
            return func(*args, **kwargs)
        return wrapper
    return decorator