"""
Goal Management API Router
Based on CLAUDE.md specification with hierarchical goal cascade
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import json
from datetime import datetime

from database import get_db
from models import Goal, GoalScope, GoalType, GoalStatus, User, Quarter, GoalFreezeLog, Organization, OrganizationLevel
from schemas.goals import (
    GoalCreate, GoalUpdate, GoalProgressUpdate, GoalStatusUpdate,
    Goal as GoalSchema, GoalWithChildren, GoalProgressReport, GoalList, GoalStats,
    GoalApproval, FreezeGoalsRequest, UnfreezeGoalsRequest, FreezeGoalsResponse,
    GoalFreezeLog as GoalFreezeLogSchema
)
from schemas.auth import UserSession
from utils.auth import get_current_user
from utils.permissions import UserPermissions, SystemPermissions
from utils.goal_cascade import GoalCascadeService
from utils.notifications import NotificationService

router = APIRouter(tags=["goals"])

def get_permission_service(db: Session = Depends(get_db)) -> UserPermissions:
    return UserPermissions(db)

def get_goal_service(db: Session = Depends(get_db)) -> GoalCascadeService:
    return GoalCascadeService(db)

def get_notification_service(db: Session = Depends(get_db)) -> NotificationService:
    return NotificationService(db)

def serialize_kpis(kpis: Optional[List[str]]) -> Optional[str]:
    """Convert KPI list to JSON string for database storage"""
    if kpis is None or len(kpis) == 0:
        return None
    # Filter out empty strings
    filtered_kpis = [kpi.strip() for kpi in kpis if kpi and kpi.strip()]
    if not filtered_kpis:
        return None
    return json.dumps(filtered_kpis)

def deserialize_kpis(kpis_json: Optional[str]) -> Optional[List[str]]:
    """Convert JSON string from database to KPI list"""
    if not kpis_json:
        return None
    try:
        return json.loads(kpis_json)
    except (json.JSONDecodeError, TypeError):
        # Backward compatibility: if it's not valid JSON, treat as single item
        return [kpis_json] if kpis_json else None

def enrich_goal_dict(goal_dict: dict, goal: Goal, db: Session) -> dict:
    """Enrich goal dictionary with deserialized KPIs and related names"""
    # Deserialize KPIs
    goal_dict['kpis'] = deserialize_kpis(goal.kpis)

    # Add organization name for DEPARTMENTAL goals
    if goal.organization_id:
        org = db.query(Organization).filter(Organization.id == goal.organization_id).first()
        goal_dict['organization_name'] = org.name if org else None

    # Add owner name for INDIVIDUAL goals
    if goal.owner_id:
        owner = db.query(User).filter(User.id == goal.owner_id).first()
        goal_dict['owner_name'] = owner.name if owner else None

    # Add creator name
    if goal.created_by:
        creator = db.query(User).filter(User.id == goal.created_by).first()
        goal_dict['creator_name'] = creator.name if creator else None

    # Add approver name
    if goal.approved_by:
        approver = db.query(User).filter(User.id == goal.approved_by).first()
        goal_dict['approver_name'] = approver.name if approver else None

    # Add parent goal title
    if goal.parent_goal_id:
        parent = db.query(Goal).filter(Goal.id == goal.parent_goal_id).first()
        goal_dict['parent_goal_title'] = parent.title if parent else None

    # Add child count
    child_count = db.query(Goal).filter(Goal.parent_goal_id == goal.id).count()
    goal_dict['child_count'] = child_count

    return goal_dict

@router.get("/", response_model=GoalList)
async def get_goals(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    scope: Optional[GoalScope] = Query(None, description="Filter by goal scope: COMPANY_WIDE, DEPARTMENTAL, or INDIVIDUAL"),
    goal_type: Optional[GoalType] = None,
    status: Optional[GoalStatus] = None,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    List goals filtered by scope and permissions.

    Use the 'scope' parameter to fetch specific goal types:
    - COMPANY_WIDE: Organizational goals (yearly/quarterly) - everyone can see these
    - DEPARTMENTAL: Department/Directorate-specific goals - filtered by user's org level
    - INDIVIDUAL: Personal employee goals - user sees their own and supervisees' goals
    - No scope parameter: All goals user has access to (default behavior)
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get user's organization
    user_org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not user_org:
        raise HTTPException(status_code=404, detail="User organization not found")

    # Build base query
    query = db.query(Goal)

    # Check if user has admin access
    is_admin = permission_service.user_has_permission(user, SystemPermissions.GOAL_VIEW_ALL)

    # Apply scope-specific filtering
    if scope == GoalScope.COMPANY_WIDE:
        # Fetch only organizational goals (yearly/quarterly)
        # Everyone can see these
        query = query.filter(Goal.scope == GoalScope.COMPANY_WIDE)

    elif scope == GoalScope.DEPARTMENTAL:
        # Fetch only departmental goals
        # Filter based on user's organizational level
        query = query.filter(Goal.scope == GoalScope.DEPARTMENTAL)

        if not is_admin:
            if user_org.level == OrganizationLevel.GLOBAL:
                # Global-level users can see all departmental goals
                pass  # No additional filtering
            elif user_org.level == OrganizationLevel.DIRECTORATE:
                # Directorate-level users can see all departmental goals in their directorate
                # Get all organizations under this directorate
                def get_all_child_org_ids(org_id):
                    """Recursively get all child organization IDs"""
                    child_ids = [org_id]
                    children = db.query(Organization).filter(Organization.parent_id == org_id).all()
                    for child in children:
                        child_ids.extend(get_all_child_org_ids(child.id))
                    return child_ids

                accessible_org_ids = get_all_child_org_ids(user.organization_id)
                query = query.filter(Goal.organization_id.in_(accessible_org_ids))
            else:
                # Department/Division/Unit level users can only see goals in their department
                query = query.filter(Goal.organization_id == user.organization_id)

    elif scope == GoalScope.INDIVIDUAL:
        # Fetch only individual goals
        # User can see their own goals and their supervisees' goals
        query = query.filter(Goal.scope == GoalScope.INDIVIDUAL)

        if not is_admin:
            # Get user's supervisees
            supervisee_ids = [s.id for s in db.query(User).filter(User.supervisor_id == user.id).all()]

            from sqlalchemy import or_
            query = query.filter(
                or_(
                    Goal.owner_id == user.id,
                    Goal.owner_id.in_(supervisee_ids),
                    Goal.created_by == user.id
                )
            )

    else:
        # No scope specified - return all goals user has access to
        # This is the default behavior for backward compatibility
        if not is_admin:
            from sqlalchemy import or_

            # Get supervisees
            supervisee_ids = [s.id for s in db.query(User).filter(User.supervisor_id == user.id).all()]

            # Determine accessible organizations for departmental goals
            if user_org.level == OrganizationLevel.GLOBAL:
                accessible_org_ids = [org.id for org in db.query(Organization).all()]
            elif user_org.level == OrganizationLevel.DIRECTORATE:
                def get_all_child_org_ids(org_id):
                    child_ids = [org_id]
                    children = db.query(Organization).filter(Organization.parent_id == org_id).all()
                    for child in children:
                        child_ids.extend(get_all_child_org_ids(child.id))
                    return child_ids
                accessible_org_ids = get_all_child_org_ids(user.organization_id)
            else:
                accessible_org_ids = [user.organization_id]

            # Combined visibility filter
            visibility_filter = or_(
                Goal.scope == GoalScope.COMPANY_WIDE,
                (Goal.scope == GoalScope.DEPARTMENTAL) & (Goal.organization_id.in_(accessible_org_ids)),
                (Goal.scope == GoalScope.INDIVIDUAL) & (
                    or_(
                        Goal.owner_id == user.id,
                        Goal.owner_id.in_(supervisee_ids),
                        Goal.created_by == user.id
                    )
                )
            )
            query = query.filter(visibility_filter)

    # Apply additional filters
    if goal_type:
        query = query.filter(Goal.type == goal_type)

    if status:
        query = query.filter(Goal.status == status)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * per_page
    goals = query.offset(offset).limit(per_page).all()

    # Enrich goals with additional names and counts
    goal_responses = []
    for goal in goals:
        goal_dict = GoalSchema.from_orm(goal).dict()
        goal_dict = enrich_goal_dict(goal_dict, goal, db)
        goal_responses.append(GoalSchema(**goal_dict))

    return GoalList(
        goals=goal_responses,
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/supervisees", response_model=List[GoalSchema])
async def get_supervisees_goals(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Get all goals belonging to the current user's supervisees
    Only returns individual goals
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all supervisees
    supervisees = db.query(User).filter(User.supervisor_id == user.id).all()
    supervisee_ids = [s.id for s in supervisees]

    if not supervisee_ids:
        return []

    # Get all individual goals owned by supervisees
    goals = db.query(Goal).filter(
        Goal.scope == GoalScope.INDIVIDUAL,
        Goal.owner_id.in_(supervisee_ids)
    ).all()

    # Manually populate owner_name, creator_name, and other user names for each goal
    goal_responses = []
    for goal in goals:
        goal_dict = GoalSchema.from_orm(goal).dict()
        goal_dict = enrich_goal_dict(goal_dict, goal, db)
        goal_responses.append(GoalSchema(**goal_dict))

    return goal_responses

@router.get("/stats", response_model=GoalStats)
async def get_goal_stats(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Get goal statistics and analytics
    Returns stats based on user's access scope
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get accessible organizations
    accessible_org_ids = permission_service.get_accessible_organizations(user)

    # Get all goals (company-wide)
    if permission_service.user_has_permission(user, SystemPermissions.GOAL_VIEW_ALL):
        goals = db.query(Goal).all()
    else:
        # Can only see goals they created
        goals = db.query(Goal).filter(Goal.created_by == user.id).all()

    # Calculate statistics
    total_goals = len(goals)

    by_type = {}
    for goal_type in GoalType:
        by_type[goal_type.value] = sum(1 for goal in goals if goal.type == goal_type)

    by_status = {}
    for goal_status in GoalStatus:
        by_status[goal_status.value] = sum(1 for goal in goals if goal.status == goal_status)

    # Calculate average progress
    total_progress = sum(goal.progress_percentage for goal in goals if goal.progress_percentage)
    average_progress = total_progress / len(goals) if goals else 0

    # Count overdue goals
    from datetime import date
    today = date.today()
    overdue_goals = sum(1 for goal in goals
                       if goal.end_date < today and goal.status == GoalStatus.ACTIVE)

    return GoalStats(
        total_goals=total_goals,
        by_type=by_type,
        by_status=by_status,
        average_progress=average_progress,
        overdue_goals=overdue_goals
    )

@router.post("/freeze-quarter", response_model=FreezeGoalsResponse)
async def freeze_goals_for_quarter(
    freeze_request: FreezeGoalsRequest,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Freeze all goals for a specific quarter
    Frozen goals cannot be edited
    Only users with goal_freeze permission can freeze goals
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Permission check
    if not permission_service.user_has_permission(user, 'goal_freeze'):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to freeze goals"
        )

    # Get all individual goals for the specified quarter and year
    goals = db.query(Goal).filter(
        Goal.scope == GoalScope.INDIVIDUAL,
        Goal.quarter == freeze_request.quarter,
        Goal.year == freeze_request.year,
        Goal.frozen == False  # Only freeze goals that aren't already frozen
    ).all()

    if not goals:
        # Still log the action even if no goals found
        freeze_log = GoalFreezeLog(
            action='freeze',
            quarter=freeze_request.quarter,
            year=freeze_request.year,
            affected_goals_count=0,
            scheduled_unfreeze_date=freeze_request.scheduled_unfreeze_date,
            performed_by=user.id
        )
        db.add(freeze_log)
        db.commit()

        return FreezeGoalsResponse(
            affected_count=0,
            message=f"No unfrozen individual goals found for {freeze_request.quarter.value} {freeze_request.year}"
        )

    # Freeze all goals
    frozen_count = 0
    for goal in goals:
        goal.frozen = True
        goal.frozen_at = datetime.now()
        goal.frozen_by = user.id
        frozen_count += 1

    # Create freeze log
    freeze_log = GoalFreezeLog(
        action='freeze',
        quarter=freeze_request.quarter,
        year=freeze_request.year,
        affected_goals_count=frozen_count,
        scheduled_unfreeze_date=freeze_request.scheduled_unfreeze_date,
        performed_by=user.id
    )
    db.add(freeze_log)
    db.commit()

    # Send notifications to affected users
    try:
        notification_service = NotificationService(db)
        affected_user_ids = list(set([goal.owner_id for goal in goals if goal.owner_id]))
        notification_service.notify_goals_frozen(
            quarter=freeze_request.quarter.value,
            year=freeze_request.year,
            affected_user_ids=affected_user_ids,
            frozen_by=user
        )
    except Exception as e:
        print(f"Error sending freeze notifications: {e}")

    return FreezeGoalsResponse(
        affected_count=frozen_count,
        message=f"Successfully frozen {frozen_count} goal(s) for {freeze_request.quarter.value} {freeze_request.year}"
    )


@router.post("/unfreeze-quarter", response_model=FreezeGoalsResponse)
async def unfreeze_goals_for_quarter(
    unfreeze_request: UnfreezeGoalsRequest,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Unfreeze all goals for a specific quarter
    Allows editing of previously frozen goals
    Supports emergency override with required reason
    Only users with goal_freeze permission can unfreeze goals
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Permission check
    if not permission_service.user_has_permission(user, 'goal_freeze'):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to unfreeze goals"
        )

    # Get all frozen individual goals for the specified quarter and year
    goals = db.query(Goal).filter(
        Goal.scope == GoalScope.INDIVIDUAL,
        Goal.quarter == unfreeze_request.quarter,
        Goal.year == unfreeze_request.year,
        Goal.frozen == True  # Only unfreeze goals that are currently frozen
    ).all()

    if not goals:
        # Still log the action even if no goals found
        unfreeze_log = GoalFreezeLog(
            action='unfreeze',
            quarter=unfreeze_request.quarter,
            year=unfreeze_request.year,
            affected_goals_count=0,
            is_emergency_override=unfreeze_request.is_emergency_override,
            emergency_reason=unfreeze_request.emergency_reason,
            performed_by=user.id
        )
        db.add(unfreeze_log)
        db.commit()

        return FreezeGoalsResponse(
            affected_count=0,
            message=f"No frozen individual goals found for {unfreeze_request.quarter.value} {unfreeze_request.year}"
        )

    # Unfreeze all goals
    unfrozen_count = 0
    for goal in goals:
        goal.frozen = False
        goal.frozen_at = None
        goal.frozen_by = None
        unfrozen_count += 1

    # Create unfreeze log
    unfreeze_log = GoalFreezeLog(
        action='unfreeze',
        quarter=unfreeze_request.quarter,
        year=unfreeze_request.year,
        affected_goals_count=unfrozen_count,
        is_emergency_override=unfreeze_request.is_emergency_override,
        emergency_reason=unfreeze_request.emergency_reason,
        performed_by=user.id
    )
    db.add(unfreeze_log)
    db.commit()

    # Send notifications to affected users
    try:
        notification_service = NotificationService(db)
        affected_user_ids = list(set([goal.owner_id for goal in goals if goal.owner_id]))
        notification_service.notify_goals_unfrozen(
            quarter=unfreeze_request.quarter.value,
            year=unfreeze_request.year,
            affected_user_ids=affected_user_ids,
            unfrozen_by=user,
            is_emergency=unfreeze_request.is_emergency_override
        )
    except Exception as e:
        print(f"Error sending unfreeze notifications: {e}")

    override_msg = " (Emergency Override)" if unfreeze_request.is_emergency_override else ""
    return FreezeGoalsResponse(
        affected_count=unfrozen_count,
        message=f"Successfully unfrozen {unfrozen_count} goal(s) for {unfreeze_request.quarter.value} {unfreeze_request.year}{override_msg}"
    )


@router.get("/freeze-logs", response_model=List[GoalFreezeLogSchema])
async def get_freeze_logs(
    quarter: Optional[Quarter] = None,
    year: Optional[int] = None,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get freeze/unfreeze logs
    Everyone can view these logs for transparency
    """
    query = db.query(GoalFreezeLog)

    # Apply filters
    if quarter:
        query = query.filter(GoalFreezeLog.quarter == quarter)
    if year:
        query = query.filter(GoalFreezeLog.year == year)

    logs = query.order_by(GoalFreezeLog.performed_at.desc()).all()

    # Enrich with performer names
    result = []
    for log in logs:
        performer = db.query(User).filter(User.id == log.performed_by).first()
        log_dict = {
            "id": log.id,
            "action": log.action,
            "quarter": log.quarter,
            "year": log.year,
            "affected_goals_count": log.affected_goals_count,
            "scheduled_unfreeze_date": log.scheduled_unfreeze_date,
            "is_emergency_override": log.is_emergency_override,
            "emergency_reason": log.emergency_reason,
            "performer_name": performer.name if performer else None,
            "performed_at": log.performed_at
        }
        result.append(GoalFreezeLogSchema(**log_dict))

    return result


@router.post("/create-for-supervisee", response_model=GoalSchema)
async def create_goal_for_supervisee(
    goal_data: GoalCreate,
    supervisee_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """
    Supervisor creates a goal for their supervisee
    Goal starts as ACTIVE and can be worked on immediately
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get supervisee
    supervisee = db.query(User).filter(User.id == supervisee_id).first()
    if not supervisee:
        raise HTTPException(status_code=404, detail="Supervisee not found")

    # Check if current user is the supervisor
    if supervisee.supervisor_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only create goals for your direct supervisees"
        )

    # Only individual goals can be created for supervisees
    if goal_data.scope != GoalScope.INDIVIDUAL:
        raise HTTPException(
            status_code=400,
            detail="Only individual goals can be created for supervisees"
        )

    # Validate individual goal requirements
    if not goal_data.quarter or not goal_data.year:
        raise HTTPException(
            status_code=400,
            detail="Quarter and year are required for individual goals"
        )

    # Create goal
    goal = Goal(
        title=goal_data.title,
        description=goal_data.description,
        kpis=serialize_kpis(goal_data.kpis),
        scope=goal_data.scope,
        type=goal_data.type,
        start_date=goal_data.start_date,
        end_date=goal_data.end_date,
        quarter=goal_data.quarter,
        year=goal_data.year,
        parent_goal_id=goal_data.parent_goal_id,
        created_by=user.id,
        owner_id=supervisee_id,  # Supervisee is the owner
        status=GoalStatus.ACTIVE  # No approval needed
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)

    # Create goal assignment record
    from models import GoalAssignment
    assignment = GoalAssignment(
        goal_id=goal.id,
        assigned_by=user.id,
        assigned_to=supervisee_id,
        status=GoalStatus.ACTIVE
    )
    db.add(assignment)
    db.commit()

    # Send notification to supervisee
    try:
        notification_service.notify_goal_assigned(goal, user, supervisee)
    except Exception as e:
        print(f"Error sending goal assignment notification: {e}")

    return GoalSchema.from_orm(goal)


@router.put("/{goal_id}/respond", response_model=GoalSchema)
async def respond_to_assigned_goal(
    goal_id: uuid.UUID,
    accepted: bool = Query(..., description="Whether the goal is accepted"),
    response_message: Optional[str] = Query(None, description="Optional response message"),
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """
    Supervisee accepts or declines a goal assigned by their supervisor
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Check if user is the goal owner
    if goal.owner_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only respond to goals assigned to you"
        )

    # Check if goal is pending approval
    if goal.status != GoalStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Goal is not pending approval (current status: {goal.status})"
        )

    # Check if goal is frozen
    if goal.frozen:
        raise HTTPException(status_code=400, detail="Cannot respond to frozen goal")

    # Get assignment record
    from models import GoalAssignment
    assignment = db.query(GoalAssignment).filter(
        GoalAssignment.goal_id == goal_id,
        GoalAssignment.assigned_to == user.id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Goal assignment not found")

    # Update goal and assignment
    if accepted:
        goal.status = GoalStatus.ACTIVE
        goal.approved_at = datetime.now()
        goal.approved_by = user.id
        assignment.status = GoalStatus.ACTIVE
    else:
        goal.status = GoalStatus.REJECTED
        goal.rejection_reason = response_message or "Declined by supervisee"
        assignment.status = GoalStatus.REJECTED

    assignment.response_message = response_message
    assignment.responded_at = datetime.now()

    db.commit()
    db.refresh(goal)

    # Send notification to supervisor
    try:
        supervisor = db.query(User).filter(User.id == goal.created_by).first()
        if supervisor:
            if accepted:
                notification_service.notify_goal_accepted(goal, user, supervisor)
            else:
                notification_service.notify_goal_declined(goal, user, supervisor, response_message or "")
    except Exception as e:
        print(f"Error sending response notification: {e}")

    return GoalSchema.from_orm(goal)


@router.put("/{goal_id}/request-change", response_model=GoalSchema)
async def request_goal_change(
    goal_id: uuid.UUID,
    change_request: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """
    Supervisee requests a change to their goal
    Supervisor must re-approve the goal after changes
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Check if user is the goal owner
    if goal.owner_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only request changes to your own goals"
        )

    # Check if goal is frozen
    if goal.frozen:
        raise HTTPException(status_code=400, detail="Cannot request changes to frozen goal")

    # Set goal back to pending approval
    goal.status = GoalStatus.PENDING_APPROVAL
    goal.rejection_reason = f"Change requested: {change_request}"
    goal.approved_at = None
    goal.approved_by = None

    db.commit()
    db.refresh(goal)

    # Send notification to supervisor
    try:
        supervisor = user.supervisor if user.supervisor else db.query(User).filter(User.id == goal.created_by).first()
        if supervisor:
            notification_service.notify_goal_change_requested(goal, user, supervisor, change_request)
    except Exception as e:
        print(f"Error sending change request notification: {e}")

    return GoalSchema.from_orm(goal)

@router.post("/", response_model=GoalSchema)
async def create_goal(
    goal_data: GoalCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service),
    goal_service: GoalCascadeService = Depends(get_goal_service)
):
    """
    Create new goal with permission gating by scope
    - COMPANY_WIDE: Company-wide organizational goals (requires goal_create_yearly/quarterly permission based on type)
    - DEPARTMENTAL: Department/Directorate-specific goals (requires goal_create_departmental permission)
    - INDIVIDUAL: Personal employee goals (no special permission required, starts as ACTIVE)
    """

    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # All goals start as ACTIVE (no approval needed)
    initial_status = GoalStatus.ACTIVE

    # Check permission based on goal scope (individual goals don't need special permission)
    if goal_data.scope != GoalScope.INDIVIDUAL:
        # For non-individual goals, check if user has permission for that scope
        if goal_data.scope == GoalScope.COMPANY_WIDE:
            # Company-wide goals need yearly or quarterly permission depending on type
            required_permission = f"goal_create_{goal_data.type.value.lower()}"
        else:
            # Departmental goals need departmental permission
            required_permission = "goal_create_departmental"

        if not permission_service.user_has_permission(user, required_permission):
            raise HTTPException(status_code=403, detail=f"Missing permission: {required_permission}")

    # Validate departmental goal requirements
    if goal_data.scope == GoalScope.DEPARTMENTAL:
        if not goal_data.organization_id:
            raise HTTPException(status_code=400, detail="Organization ID is required for departmental goals")

        # Verify organization exists and user can access it
        org = db.query(Organization).filter(Organization.id == goal_data.organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        if not permission_service.user_can_access_organization(user, goal_data.organization_id):
            raise HTTPException(status_code=403, detail="Cannot create goal for organization outside your scope")

    # Validate parent goal relationship if specified
    if goal_data.parent_goal_id:
        parent_goal = db.query(Goal).filter(Goal.id == goal_data.parent_goal_id).first()
        if not parent_goal:
            raise HTTPException(status_code=404, detail="Parent goal not found")

        # Validate relationship using cascade service
        temp_goal = Goal(**goal_data.dict(exclude={'parent_goal_id', 'tag_ids', 'owner_id'}))
        if not goal_service.validate_goal_relationship(goal_data.parent_goal_id, temp_goal):
            raise HTTPException(status_code=400, detail="Invalid parent-child goal relationship")

    # Validate quarterly goal requirements (quarter and year needed for all quarterly goals)
    if goal_data.type == GoalType.QUARTERLY:
        if not goal_data.quarter:
            raise HTTPException(status_code=400, detail="Quarter is required for quarterly goals")
        if not goal_data.year:
            raise HTTPException(status_code=400, detail="Year is required for quarterly goals")

    # Create goal
    goal = Goal(
        title=goal_data.title,
        description=goal_data.description,
        kpis=serialize_kpis(goal_data.kpis),
        scope=goal_data.scope,
        type=goal_data.type,
        start_date=goal_data.start_date,
        end_date=goal_data.end_date,
        quarter=goal_data.quarter if goal_data.type == GoalType.QUARTERLY else None,
        year=goal_data.year if goal_data.type == GoalType.QUARTERLY else None,
        parent_goal_id=goal_data.parent_goal_id,
        created_by=user.id,
        owner_id=goal_data.owner_id if goal_data.owner_id else user.id,  # Default to creator as owner
        organization_id=goal_data.organization_id,  # For DEPARTMENTAL scope goals
        status=initial_status
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)

    # Add tags if provided
    if goal_data.tag_ids:
        from models import GoalTag
        for tag_id in goal_data.tag_ids:
            tag = db.query(GoalTag).filter(GoalTag.id == tag_id).first()
            if tag:
                goal.tags.append(tag)
        db.commit()
        db.refresh(goal)

    # Send notification if individual goal created (for supervisor awareness)
    if goal.scope == GoalScope.INDIVIDUAL and user.supervisor_id:
        try:
            notification_service = NotificationService(db)
            notification_service.notify_goal_created(goal, user)
        except Exception as e:
            print(f"Error sending goal creation notification: {e}")

    return GoalSchema.from_orm(goal)

@router.get("/{goal_id}", response_model=GoalSchema)
async def get_goal(
    goal_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Get goal details
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Check access permissions
    # Check access permissions - all goals are company-wide
    if not permission_service.user_has_permission(user, SystemPermissions.GOAL_VIEW_ALL):
        if goal.created_by != user.id:
            raise HTTPException(status_code=403, detail="Cannot access this goal")

    # Enrich goal with additional names and counts
    goal_dict = GoalSchema.from_orm(goal).dict()
    goal_dict = enrich_goal_dict(goal_dict, goal, db)
    return GoalSchema(**goal_dict)

@router.put("/{goal_id}", response_model=GoalSchema)
async def update_goal(
    goal_id: uuid.UUID,
    goal_data: GoalUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Edit goal details
    Requires GOAL_EDIT permission
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not permission_service.user_has_permission(user, SystemPermissions.GOAL_EDIT):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Check if goal is frozen
    if goal.frozen:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit frozen goal. This goal was frozen on {goal.frozen_at.strftime('%Y-%m-%d') if goal.frozen_at else 'unknown date'}."
        )

    # Check access permissions
    if not permission_service.user_has_permission(user, SystemPermissions.GOAL_EDIT):
        if goal.created_by != user.id:
            raise HTTPException(status_code=403, detail="Cannot modify this goal")

    # Update fields
    update_data = goal_data.dict(exclude_unset=True)

    # Handle tags separately (relationship field)
    tag_ids = update_data.pop('tag_ids', None)

    # Serialize KPIs if present
    if 'kpis' in update_data:
        update_data['kpis'] = serialize_kpis(update_data['kpis'])

    # If type is being changed to YEARLY, clear quarter and year
    if 'type' in update_data and update_data['type'] == GoalType.YEARLY:
        goal.quarter = None
        goal.year = None

    # Validate quarter/year for QUARTERLY goals
    if 'type' in update_data and update_data['type'] == GoalType.QUARTERLY:
        # If changing to QUARTERLY, ensure quarter and year are provided
        quarter = update_data.get('quarter', goal.quarter)
        year = update_data.get('year', goal.year)
        if not quarter:
            raise HTTPException(status_code=400, detail="Quarter is required for quarterly goals")
        if not year:
            raise HTTPException(status_code=400, detail="Year is required for quarterly goals")

    for field, value in update_data.items():
        # Skip quarter/year for YEARLY goals
        if goal.type == GoalType.YEARLY and field in ['quarter', 'year']:
            continue
        setattr(goal, field, value)

    # Update tags if provided
    if tag_ids is not None:
        from models import GoalTag
        # Clear existing tags
        goal.tags.clear()
        # Add new tags
        for tag_id in tag_ids:
            tag = db.query(GoalTag).filter(GoalTag.id == tag_id).first()
            if tag:
                goal.tags.append(tag)

    db.commit()
    db.refresh(goal)

    return GoalSchema.from_orm(goal)

@router.put("/{goal_id}/progress", response_model=GoalSchema)
async def update_goal_progress(
    goal_id: uuid.UUID,
    progress_data: GoalProgressUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service),
    goal_service: GoalCascadeService = Depends(get_goal_service)
):
    """
    Update progress percentage with required report
    Only allowed for goals without children (leaf goals)
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Allow super-admin or users with goal progress update permission
    is_super_admin = permission_service.user_has_permission(user, SystemPermissions.SYSTEM_ADMIN)
    has_progress_permission = permission_service.user_has_permission(user, SystemPermissions.GOAL_PROGRESS_UPDATE)

    if not (is_super_admin or has_progress_permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Super-admin can access any goal, others need organizational access
    if not is_super_admin:
        if goal.created_by != user.id:
            raise HTTPException(status_code=403, detail="Cannot update progress for this goal")

    try:
        # Use cascade service to update progress
        success = goal_service.update_goal_progress(
            goal_id, progress_data.new_percentage, progress_data.report, user.id
        )

        if not success:
            raise HTTPException(status_code=400, detail="Failed to update goal progress")

        db.refresh(goal)
        return GoalSchema.from_orm(goal)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{goal_id}/status", response_model=GoalSchema)
async def update_goal_status(
    goal_id: uuid.UUID,
    status_data: GoalStatusUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service),
    goal_service: GoalCascadeService = Depends(get_goal_service)
):
    """
    Mark goal as achieved or discard
    Status changes trigger parent goal achievement check
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not permission_service.user_has_permission(user, SystemPermissions.GOAL_STATUS_CHANGE):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Check access permissions
    if not permission_service.user_has_permission(user, SystemPermissions.GOAL_STATUS_CHANGE):
        if goal.created_by != user.id:
            raise HTTPException(status_code=403, detail="Cannot update status for this goal")

    if status_data.status == GoalStatus.DISCARDED:
        success = goal_service.discard_goal(goal_id, "Manual discard", user.id)
    else:
        goal.status = status_data.status
        if status_data.status == GoalStatus.ACHIEVED:
            goal.achieved_at = db.func.now()
            goal.progress_percentage = 100

        db.commit()

        # Check parent goal cascade if achieving this goal
        if status_data.status == GoalStatus.ACHIEVED and goal.parent_goal_id:
            goal_service.check_goal_auto_achievement(goal.parent_goal_id)

        success = True

    if not success:
        raise HTTPException(status_code=400, detail="Failed to update goal status")

    db.refresh(goal)
    return GoalSchema.from_orm(goal)

@router.get("/{goal_id}/children", response_model=List[GoalSchema])
async def get_goal_children(
    goal_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    goal_service: GoalCascadeService = Depends(get_goal_service)
):
    """
    Get child goals
    """
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    children = goal_service.get_child_goals(goal_id)
    return [GoalSchema.from_orm(child) for child in children]

@router.get("/{goal_id}/hierarchy")
async def get_goal_hierarchy(
    goal_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    goal_service: GoalCascadeService = Depends(get_goal_service)
):
    """
    Get complete goal hierarchy starting from specified goal
    Returns nested structure showing parent-child relationships
    """
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    hierarchy = goal_service.get_goal_hierarchy(goal_id)
    return hierarchy

@router.post("/{goal_id}/progress-report", response_model=GoalProgressReport)
async def add_progress_report(
    goal_id: uuid.UUID,
    progress_data: GoalProgressUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service),
    goal_service: GoalCascadeService = Depends(get_goal_service)
):
    """
    Add progress report (same as update progress but returns the report)
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not permission_service.user_has_permission(user, SystemPermissions.GOAL_PROGRESS_UPDATE):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        success = goal_service.update_goal_progress(
            goal_id, progress_data.new_percentage, progress_data.report, user.id
        )

        if not success:
            raise HTTPException(status_code=400, detail="Failed to add progress report")

        # Get the latest progress report
        from models import GoalProgressReport as ProgressReportModel
        latest_report = db.query(ProgressReportModel).filter(
            ProgressReportModel.goal_id == goal_id
        ).order_by(ProgressReportModel.created_at.desc()).first()

        return GoalProgressReport.from_orm(latest_report)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{goal_id}/approve", response_model=GoalSchema)
async def approve_goal(
    goal_id: uuid.UUID,
    approval: GoalApproval,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Approve or reject an individual goal
    Only supervisors or HOD can approve goals
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Validate goal scope
    if goal.scope != GoalScope.INDIVIDUAL:
        raise HTTPException(
            status_code=400,
            detail="Only INDIVIDUAL goals require approval"
        )

    # Check if goal is pending approval
    if goal.status != GoalStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Goal is not pending approval (current status: {goal.status})"
        )

    # Permission check: must be supervisor or have goal_approve permission
    goal_owner = db.query(User).filter(User.id == goal.owner_id).first()
    can_approve = (
        (goal_owner and goal_owner.supervisor_id == user.id) or  # Is supervisor
        permission_service.user_has_permission(user, 'goal_approve')  # Has permission
    )

    if not can_approve:
        raise HTTPException(
            status_code=403,
            detail="Only supervisors or authorized users can approve goals"
        )

    # Check if goal is frozen
    if goal.frozen:
        raise HTTPException(status_code=400, detail="Cannot approve frozen goal")

    # Apply approval
    if approval.approved:
        goal.status = GoalStatus.ACTIVE
        goal.approved_at = datetime.now()
        goal.approved_by = user.id
        goal.rejection_reason = None
    else:
        goal.status = GoalStatus.REJECTED
        goal.rejection_reason = approval.rejection_reason
        goal.approved_by = user.id
        goal.approved_at = datetime.now()

    db.commit()
    db.refresh(goal)

    # Send notification to goal owner
    try:
        notification_service = NotificationService(db)
        if approval.approved and goal_owner:
            notification_service.notify_goal_approved(goal, user, goal_owner)
        elif not approval.approved and goal_owner:
            notification_service.notify_goal_rejected(goal, user, goal_owner, approval.rejection_reason or "")
    except Exception as e:
        print(f"Error sending approval notification: {e}")

    return GoalSchema.from_orm(goal)

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Delete a goal
    Only the goal creator or users with goal_edit permission can delete goals
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Check if goal is frozen
    if goal.frozen:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete frozen goal"
        )

    # Permission check: must be creator or have goal_edit permission
    can_delete = (
        goal.created_by == user.id or
        goal.owner_id == user.id or
        permission_service.user_has_permission(user, SystemPermissions.GOAL_EDIT)
    )

    if not can_delete:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this goal"
        )

    # Check if goal has children
    children = db.query(Goal).filter(Goal.parent_goal_id == goal_id).count()
    if children > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete goal with child goals. Please delete or reassign child goals first."
        )

    # Delete goal
    db.delete(goal)
    db.commit()

    return {"message": "Goal deleted successfully"}


@router.post("/{goal_id}/freeze")
async def freeze_goal(
    goal_id: uuid.UUID,
    reason: str = None,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Freeze an individual goal to prevent editing
    Requires goal_freeze permission
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not permission_service.user_has_permission(user, "goal_freeze"):
        raise HTTPException(status_code=403, detail="Insufficient permissions to freeze goals")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if goal.frozen:
        raise HTTPException(status_code=400, detail="Goal is already frozen")

    # Freeze the goal
    goal.frozen = True
    goal.frozen_at = datetime.now()
    goal.frozen_by = user.id

    db.commit()
    db.refresh(goal)

    return {
        "message": "Goal frozen successfully",
        "goal_id": str(goal_id),
        "frozen_at": goal.frozen_at,
        "frozen_by": str(user.id)
    }


@router.post("/{goal_id}/unfreeze")
async def unfreeze_goal(
    goal_id: uuid.UUID,
    reason: str = None,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Unfreeze a goal to allow editing again
    Requires goal_freeze permission
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not permission_service.user_has_permission(user, "goal_freeze"):
        raise HTTPException(status_code=403, detail="Insufficient permissions to unfreeze goals")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if not goal.frozen:
        raise HTTPException(status_code=400, detail="Goal is not frozen")

    # Unfreeze the goal
    goal.frozen = False
    goal.frozen_at = None
    goal.frozen_by = None

    db.commit()
    db.refresh(goal)

    return {
        "message": "Goal unfrozen successfully",
        "goal_id": str(goal_id)
    }
