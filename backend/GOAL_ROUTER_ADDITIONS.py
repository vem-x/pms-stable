"""
NEW ENDPOINTS TO ADD TO backend/routers/goals.py

These endpoints implement the supervisor-supervisee goal approval workflows.
Add these to the existing goals.py file.
"""

# ADD THESE IMPORTS AT THE TOP:
"""
from models import GoalAssignment
from utils.notifications import NotificationService
"""

# ADD THESE ENDPOINTS TO THE ROUTER:

@router.post("/assign", response_model=GoalSchema)
async def assign_goal_to_supervisee(
    goal_data: GoalCreate,
    assigned_to_user_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db),
    permission_service: UserPermissions = Depends(get_permission_service)
):
    """
    Supervisor creates and assigns a goal to a supervisee
    The supervisee must accept or decline the goal
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get the supervisee
    supervisee = db.query(User).filter(User.id == assigned_to_user_id).first()
    if not supervisee:
        raise HTTPException(status_code=404, detail="Supervisee not found")

    # Verify that current user is the supervisee's supervisor
    if supervisee.supervisor_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only assign goals to your direct reports"
        )

    # Create the goal
    goal = Goal(
        title=goal_data.title,
        description=goal_data.description,
        type=GoalType.INDIVIDUAL,  # Assigned goals are always individual
        evaluation_method=goal_data.evaluation_method,
        difficulty_level=goal_data.difficulty_level,
        start_date=goal_data.start_date,
        end_date=goal_data.end_date,
        quarter=goal_data.quarter,
        year=goal_data.year,
        parent_goal_id=goal_data.parent_goal_id,
        created_by=user.id,
        owner_id=assigned_to_user_id,
        status=GoalStatus.PENDING_APPROVAL  # Awaiting supervisee acceptance
    )

    db.add(goal)
    db.flush()  # Get goal ID without committing

    # Create goal assignment record
    assignment = GoalAssignment(
        goal_id=goal.id,
        assigned_by=user.id,
        assigned_to=assigned_to_user_id,
        status=GoalStatus.PENDING_APPROVAL
    )

    db.add(assignment)
    db.commit()
    db.refresh(goal)

    # Send notification to supervisee
    notif_service = NotificationService(db)
    notif_service.notify_goal_assigned(goal, user, supervisee)

    return GoalSchema.from_orm(goal)


@router.put("/{goal_id}/approve", response_model=GoalSchema)
async def approve_personal_goal(
    goal_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supervisor approves a supervisee's personal goal
    Changes status from PENDING_APPROVAL to ACTIVE
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Verify it's an individual goal pending approval
    if goal.type != GoalType.INDIVIDUAL:
        raise HTTPException(
            status_code=400,
            detail="Only individual goals require approval"
        )

    if goal.status != GoalStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Goal is not pending approval (current status: {goal.status.value})"
        )

    # Verify current user is the goal owner's supervisor
    goal_owner = db.query(User).filter(User.id == goal.owner_id).first()
    if not goal_owner or goal_owner.supervisor_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only approve goals for your direct reports"
        )

    # Approve the goal
    goal.status = GoalStatus.ACTIVE
    goal.approved_at = datetime.utcnow()
    goal.approved_by = user.id

    db.commit()
    db.refresh(goal)

    # Send notification to goal owner
    notif_service = NotificationService(db)
    notif_service.notify_goal_approved(goal, user, goal_owner)

    return GoalSchema.from_orm(goal)


@router.put("/{goal_id}/reject")
async def reject_personal_goal(
    goal_id: uuid.UUID,
    rejection_reason: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supervisor rejects a supervisee's personal goal
    Changes status to REJECTED with reason
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Verify it's an individual goal pending approval
    if goal.type != GoalType.INDIVIDUAL:
        raise HTTPException(
            status_code=400,
            detail="Only individual goals can be rejected"
        )

    if goal.status != GoalStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Goal is not pending approval (current status: {goal.status.value})"
        )

    # Verify current user is the goal owner's supervisor
    goal_owner = db.query(User).filter(User.id == goal.owner_id).first()
    if not goal_owner or goal_owner.supervisor_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only reject goals for your direct reports"
        )

    # Reject the goal
    goal.status = GoalStatus.REJECTED
    goal.rejection_reason = rejection_reason
    goal.approved_by = user.id  # Track who rejected it
    goal.approved_at = datetime.utcnow()

    db.commit()
    db.refresh(goal)

    # Send notification to goal owner
    notif_service = NotificationService(db)
    notif_service.notify_goal_rejected(goal, user, goal_owner, rejection_reason)

    return {"message": "Goal rejected", "goal_id": str(goal_id)}


@router.put("/{goal_id}/accept", response_model=GoalSchema)
async def accept_assigned_goal(
    goal_id: uuid.UUID,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supervisee accepts a goal assigned by their supervisor
    Changes status from PENDING_APPROVAL to ACTIVE
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Verify user is the goal owner
    if goal.owner_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only accept goals assigned to you"
        )

    # Verify it's pending approval
    if goal.status != GoalStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Goal is not pending approval (current status: {goal.status.value})"
        )

    # Get the assignment record
    assignment = db.query(GoalAssignment).filter(
        GoalAssignment.goal_id == goal_id,
        GoalAssignment.assigned_to == user.id
    ).first()

    # Accept the goal
    goal.status = GoalStatus.ACTIVE
    db.commit()

    if assignment:
        assignment.status = GoalStatus.ACTIVE
        assignment.responded_at = datetime.utcnow()
        db.commit()

        # Notify the supervisor who assigned it
        assigner = db.query(User).filter(User.id == assignment.assigned_by).first()
        if assigner:
            notif_service = NotificationService(db)
            notif_service.notify_goal_accepted(goal, user, assigner)

    db.refresh(goal)
    return GoalSchema.from_orm(goal)


@router.put("/{goal_id}/decline")
async def decline_assigned_goal(
    goal_id: uuid.UUID,
    decline_reason: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supervisee declines a goal assigned by their supervisor
    Changes status to REJECTED with reason
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Verify user is the goal owner
    if goal.owner_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only decline goals assigned to you"
        )

    # Verify it's pending approval
    if goal.status != GoalStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail=f"Goal is not pending approval (current status: {goal.status.value})"
        )

    # Get the assignment record
    assignment = db.query(GoalAssignment).filter(
        GoalAssignment.goal_id == goal_id,
        GoalAssignment.assigned_to == user.id
    ).first()

    # Decline the goal
    goal.status = GoalStatus.REJECTED
    goal.rejection_reason = decline_reason
    db.commit()

    if assignment:
        assignment.status = GoalStatus.REJECTED
        assignment.response_message = decline_reason
        assignment.responded_at = datetime.utcnow()
        db.commit()

        # Notify the supervisor who assigned it
        assigner = db.query(User).filter(User.id == assignment.assigned_by).first()
        if assigner:
            notif_service = NotificationService(db)
            notif_service.notify_goal_declined(goal, user, assigner, decline_reason)

    return {"message": "Goal declined", "goal_id": str(goal_id)}


@router.get("/supervisee-goals", response_model=GoalList)
async def get_supervisee_goals(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    status: Optional[GoalStatus] = None,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all goals for users who report to the current user
    Enables supervisors to view and manage supervisee goals
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all users who report to current user
    supervisees = db.query(User).filter(User.supervisor_id == user.id).all()
    supervisee_ids = [s.id for s in supervisees]

    if not supervisee_ids:
        return GoalList(goals=[], total=0, page=page, per_page=per_page)

    # Query goals owned by supervisees
    query = db.query(Goal).filter(Goal.owner_id.in_(supervisee_ids))

    if status:
        query = query.filter(Goal.status == status)

    total = query.count()
    offset = (page - 1) * per_page
    goals = query.offset(offset).limit(per_page).all()

    return GoalList(
        goals=[GoalSchema.from_orm(goal) for goal in goals],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/pending-approval", response_model=GoalList)
async def get_pending_approval_goals(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all goals awaiting approval by the current user
    Returns personal goals created by supervisees that need approval
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all users who report to current user
    supervisees = db.query(User).filter(User.supervisor_id == user.id).all()
    supervisee_ids = [s.id for s in supervisees]

    if not supervisee_ids:
        return GoalList(goals=[], total=0, page=1, per_page=20)

    # Query pending approval goals owned by supervisees
    goals = db.query(Goal).filter(
        Goal.owner_id.in_(supervisee_ids),
        Goal.status == GoalStatus.PENDING_APPROVAL,
        Goal.type == GoalType.INDIVIDUAL
    ).all()

    return GoalList(
        goals=[GoalSchema.from_orm(goal) for goal in goals],
        total=len(goals),
        page=1,
        per_page=len(goals)
    )
