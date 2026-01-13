# Goals Lifecycle & Workflow

## Goal Types

### 1. ORGANIZATIONAL GOALS (YEARLY/QUARTERLY)
**Purpose**: Company-wide strategic objectives
**Created by**: Leadership with `goal_create_yearly` or `goal_create_quarterly` permission
**Visibility**: All employees can view
**Approval**: Not required (leadership decision)

#### States:
- `ACTIVE` → Currently in progress
- `ACHIEVED` → Successfully completed (auto or manual)
- `DISCARDED` → No longer relevant
- `FROZEN` → Locked for review period (no edits allowed)

#### Workflow:
```
CREATE → ACTIVE → ACHIEVED
              ↓
         DISCARDED (with reason)
              ↓
         FROZEN (during review periods)
```

---

### 2. DEPARTMENTAL GOALS (NEW)
**Purpose**: Department/Directorate-specific objectives
**Created by**: Department heads with `goal_create_departmental` permission
**Scope**: Specific to one department/directorate
**Links to**: QUARTERLY or YEARLY goals as parent
**Visibility**: All members of that department + leadership

#### States:
- Same as organizational goals
- Must be linked to parent organizational goal

#### Workflow:
```
CREATE (select parent) → ACTIVE → Track Progress → ACHIEVED
                                     ↓
                                  Sub-goals (Individual)
```

---

### 3. INDIVIDUAL GOALS
**Purpose**: Personal performance objectives
**Created by**: Employee OR Supervisor (for employee)
**Quarter & Year**: Required fields
**Approval**: Required from supervisor or department head

#### States:
- `PENDING_APPROVAL` → Awaiting supervisor approval
- `ACTIVE` → Approved and in progress
- `ACHIEVED` → Successfully completed
- `REJECTED` → Supervisor rejected (with reason)
- `DISCARDED` → Employee/supervisor marked as no longer relevant

#### Workflow - Employee Creates:
```
Employee creates goal
    ↓
PENDING_APPROVAL (notification to supervisor)
    ↓
Supervisor reviews
    ├─ APPROVE → ACTIVE
    │              ↓
    │          Track progress → ACHIEVED
    │
    └─ REJECT (with reason) → REJECTED
                                  ↓
                    Employee can revise and resubmit
```

#### Workflow - Supervisor Assigns:
```
Supervisor creates goal for employee
    ↓
ASSIGNED (notification to employee)
    ↓
Employee responds
    ├─ ACCEPT → ACTIVE
    │             ↓
    │         Track progress → ACHIEVED
    │
    └─ DECLINE (with reason) → Supervisor decides next action
```

---

## Goal Relationships

### Parent-Child Cascade
- **Organizational Goals** can have child Departmental or Individual goals
- **Departmental Goals** can have child Individual goals
- **Individual Goals** cannot have children

### Auto-Achievement Logic
When ALL non-discarded child goals reach ACHIEVED:
- Parent goal automatically becomes ACHIEVED
- Recursive check up the hierarchy
- Notifications sent to all stakeholders

### Progress Calculation
- **Leaf goals** (no children): Manual progress updates with required report
- **Parent goals** (has children): Auto-calculated as average of children progress

---

## Goal Operations

### Create Goal
**Endpoint**: `POST /api/goals`
**Required**:
- Title, description, type
- Start/end dates (optional for INDIVIDUAL)
- Parent goal (for cascading)
- Department (for DEPARTMENTAL type)
- Quarter & year (for INDIVIDUAL type)

**Validations**:
- User must have permission for goal type
- Dates must be within parent goal dates (if parent exists)
- Department must be accessible by creator

---

### Update Progress
**Endpoint**: `PUT /api/goals/{id}/progress`
**Required**:
- New percentage (0-100)
- Progress report (text explaining change)

**Rules**:
- Only for leaf goals (no children)
- Creates GoalProgressReport record
- Triggers parent progress recalculation
- Sends notification to goal stakeholders

---

### Approve/Reject Goal (Individual only)
**Endpoint**: `POST /api/goals/{id}/approve` or `/reject`
**Required**:
- Rejection reason (if rejecting)

**Rules**:
- Only supervisor or department head can approve
- Employee notified of decision
- If approved: Status → ACTIVE
- If rejected: Status → REJECTED, employee can revise

---

### Freeze/Unfreeze Goals
**Endpoint**: `POST /api/goals/{id}/freeze`
**Purpose**: Lock goals during review periods to prevent changes
**Scope**: By quarter (e.g., freeze all Q1 2024 goals)

**Rules**:
- Only users with `goal_freeze` permission
- Frozen goals cannot be edited or have progress updated
- Must provide reason for freeze
- Can set scheduled unfreeze date
- Emergency override available with justification

---

## Data Model

### Goal Table
```sql
id, title, description, type
parent_goal_id (FK → goals)
owner_id (FK → users, for INDIVIDUAL)
department_id (FK → organizations, for DEPARTMENTAL)
quarter, year (for INDIVIDUAL)
start_date, end_date
progress_percentage
status, frozen
created_by, approved_by, frozen_by
rejection_reason
approved_at, achieved_at, discarded_at, frozen_at
```

### GoalProgressReport Table
```sql
id, goal_id (FK)
old_percentage, new_percentage
report (text, required)
updated_by (FK → users)
created_at
```

---

## Notifications Triggered

1. **Goal Created** → Notify parent goal owner & department heads
2. **Goal Assigned** → Notify employee (for supervisor-created goals)
3. **Goal Needs Approval** → Notify supervisor (for employee-created goals)
4. **Goal Approved** → Notify goal owner
5. **Goal Rejected** → Notify goal owner (with reason)
6. **Progress Updated** → Notify supervisor & parent goal owners
7. **Goal Achieved** → Notify all stakeholders & parent goal owners (triggers cascade check)
8. **Goal Discarded** → Notify supervisor & parent goal owners
9. **Goal Frozen** → Notify all goal owners in that quarter
10. **Goal Auto-Achieved** → Notify parent goal owner (cascade effect)

---

## Email Notifications Required

- Goal approval request (to supervisor)
- Goal assigned notification (to employee)
- Goal approved/rejected (to employee)
- Goal achieved (to employee & supervisor)
- Goal overdue warning (approaching deadline)
- Quarter freeze notification (to all goal owners)
