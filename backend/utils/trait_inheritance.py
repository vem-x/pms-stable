"""
Trait Inheritance Logic
Handles organizational scope-based trait inheritance
"""

from sqlalchemy.orm import Session
from typing import List
from models import ReviewTrait, User, Organization, TraitScopeType
import uuid

class TraitInheritanceService:
    """
    Service for resolving trait inheritance based on organizational hierarchy

    Inheritance Rules:
    - Global traits apply to everyone
    - Directorate traits apply to all departments and units within that directorate
    - Department traits apply to all units within that department
    - Unit traits apply only to members of that specific unit
    """

    def __init__(self, db: Session):
        self.db = db

    def get_organizational_hierarchy(self, organization_id: uuid.UUID) -> List[uuid.UUID]:
        """
        Get the complete organizational hierarchy for a given organization
        Returns list of organization IDs from current up to root (global)

        Example: For a unit, returns [unit_id, department_id, directorate_id, global_id]
        """
        hierarchy = []
        current_org_id = organization_id

        while current_org_id:
            org = self.db.query(Organization).filter(Organization.id == current_org_id).first()
            if not org:
                break

            hierarchy.append(org.id)
            current_org_id = org.parent_id

        return hierarchy

    def get_applicable_traits_for_user(self, user_id: uuid.UUID) -> List[ReviewTrait]:
        """
        Get all traits applicable to a specific user based on their organizational position

        Returns:
        - All global traits
        - Traits from user's directorate (if user is in department/unit under a directorate)
        - Traits from user's department (if user is in a unit under a department)
        - Traits from user's specific unit
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.organization_id:
            # Return only global traits if user has no organization
            return self.db.query(ReviewTrait).filter(
                ReviewTrait.is_active == True,
                ReviewTrait.scope_type == TraitScopeType.GLOBAL
            ).order_by(ReviewTrait.display_order).all()

        # Get organizational hierarchy
        hierarchy = self.get_organizational_hierarchy(user.organization_id)

        # Build query for applicable traits
        # 1. Global traits (always apply)
        # 2. Traits from any organization in the user's hierarchy
        applicable_traits = self.db.query(ReviewTrait).filter(
            ReviewTrait.is_active == True,
            (
                (ReviewTrait.scope_type == TraitScopeType.GLOBAL) |
                (ReviewTrait.organization_id.in_(hierarchy))
            )
        ).order_by(ReviewTrait.display_order).all()

        # Filter by grade level: if applicable_levels is set, user.level must be in that list
        user_level = user.level
        if user_level is not None:
            applicable_traits = [
                t for t in applicable_traits
                if t.applicable_levels is None or user_level in t.applicable_levels
            ]

        return applicable_traits

    def get_applicable_traits_for_organization(self, organization_id: uuid.UUID) -> List[ReviewTrait]:
        """
        Get all traits applicable to a specific organizational unit

        Returns:
        - All global traits
        - Traits from the organization's parent hierarchy
        - Traits specific to this organization
        """
        # Get organizational hierarchy
        hierarchy = self.get_organizational_hierarchy(organization_id)

        # Get all applicable traits
        applicable_traits = self.db.query(ReviewTrait).filter(
            ReviewTrait.is_active == True,
            (
                (ReviewTrait.scope_type == TraitScopeType.GLOBAL) |
                (ReviewTrait.organization_id.in_(hierarchy))
            )
        ).order_by(ReviewTrait.display_order).all()

        return applicable_traits

    def get_users_assessed_on_trait(self, trait_id: uuid.UUID) -> List[User]:
        """
        Get all users who should be assessed on a specific trait based on its scope

        Returns:
        - For global traits: All active users
        - For scoped traits: All users in that organization and its children
        """
        trait = self.db.query(ReviewTrait).filter(ReviewTrait.id == trait_id).first()
        if not trait:
            return []

        if trait.scope_type == TraitScopeType.GLOBAL:
            # All active users
            return self.db.query(User).filter(User.status == 'active').all()

        # For scoped traits, get all users in the organization and its children
        affected_org_ids = self._get_organization_and_children(trait.organization_id)

        return self.db.query(User).filter(
            User.status == 'active',
            User.organization_id.in_(affected_org_ids)
        ).all()

    def _get_organization_and_children(self, organization_id: uuid.UUID) -> List[uuid.UUID]:
        """
        Get organization and all its children recursively
        Used to find all users affected by a scoped trait
        """
        result = [organization_id]

        # Get immediate children
        children = self.db.query(Organization).filter(
            Organization.parent_id == organization_id
        ).all()

        # Recursively get all descendants
        for child in children:
            result.extend(self._get_organization_and_children(child.id))

        return result

    def validate_trait_applicability(self, trait_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """
        Check if a specific trait applies to a specific user

        Returns True if:
        - Trait is global
        - User's organization is in the trait's scope hierarchy
        """
        trait = self.db.query(ReviewTrait).filter(ReviewTrait.id == trait_id).first()
        if not trait or not trait.is_active:
            return False

        if trait.scope_type == TraitScopeType.GLOBAL:
            return True

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.organization_id:
            return False

        # Check if user's organization is within trait's scope
        hierarchy = self.get_organizational_hierarchy(user.organization_id)
        if trait.organization_id not in hierarchy:
            return False

        # Check grade level restriction
        if trait.applicable_levels is not None and user.level not in trait.applicable_levels:
            return False

        return True
