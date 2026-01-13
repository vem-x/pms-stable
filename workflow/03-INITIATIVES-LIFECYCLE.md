# Initiatives Lifecycle & Workflow

## Overview
**Initiatives** = Projects/tasks assigned to employees
**Sub-Tasks** (NEW) = Breakdown tasks within an initiative for detailed tracking

## Initiative Types
1. **INDIVIDUAL** - Single assignee
2. **GROUP** - Multiple assignees with team head coordinator

## Urgency Levels
- `LOW` - Standard timeline
- `MEDIUM` - Normal priority (default)
- `HIGH` - Important/time-sensitive
- `URGENT` - Critical/immediate attention

---

## Initiative Status Workflow

### Status Progression:
```
PENDING_APPROVAL → ASSIGNED/PENDING → ONGOING → UNDER_REVIEW → COMPLETED
                                                                     ↓
                                                               REJECTED
                                                                     ↓
                                                    (Back to PENDING for revision)

OVERDUE (parallel state when past due_date)
```

### Detailed Status Definitions:

#### 1. PENDING_APPROVAL
**Trigger**: Employee creates initiative (self-assigned)
**Meaning**: Awaiting supervisor approval
**Actions**:
- Supervisor can approve → Status becomes PENDING
- Supervisor can reject → Status becomes REJECTED
- Employee cannot start work
**Notification**: Supervisor notified immediately

#### 2. ASSIGNED
**Trigger**: Supervisor creates and assigns initiative to employee
**Meaning**: Initiative assigned but not yet accepted by employee
**Actions**:
- Employee can accept → Status becomes PENDING
- Employee can decline (with reason) → Supervisor notified
**Notification**: Employee notified of assignment

#### 3. PENDING
**Trigger**: Initiative approved or accepted
**Meaning**: Ready to start work, not yet begun
**Actions**:
- Employee clicks "Start Initiative" → Status becomes ONGOING
- Can attach documents
- Can link to goals

#### 4. ONGOING
**Trigger**: Employee actively working on initiative
**Meaning**: Work in progress
**Actions**:
- Can update sub-tasks (NEW FEATURE)
- Can attach documents progressively
- Can request deadline extension if needed
- Employee clicks "Submit for Review" → Status becomes UNDER_REVIEW

#### 5. UNDER_REVIEW
**Trigger**: Employee submits completed work
**Meaning**: Awaiting supervisor review and scoring
**Actions**:
- Supervisor reviews submission & documents
- Supervisor provides score (1-10) and feedback
- Supervisor can:
  - APPROVE → Status becomes COMPLETED
  - REQUEST REDO → Status back to ONGOING (with feedback)
**Notification**: Supervisor notified of submission

#### 6. COMPLETED
**Trigger**: Supervisor approves with final score
**Meaning**: Initiative successfully finished
**Effects**:
- Score recorded for performance evaluation
- Completion timestamp saved
- Contributes to employee's performance metrics
- If linked to goal → Goal progress may update

#### 7. REJECTED
**Trigger**: Supervisor rejects during PENDING_APPROVAL or UNDER_REVIEW
**Meaning**: Initiative not approved or quality insufficient
**Actions**:
- Employee notified with rejection reason
- Can revise and resubmit
- Can discuss with supervisor

#### 8. OVERDUE
**Trigger**: Automated (due_date passes while not COMPLETED)
**Meaning**: Past deadline, work blocked until resolved
**Actions**:
- Employee must request deadline extension
- Cannot submit for review until extension approved
- Supervisor can approve extension → Due date updated, status reverts to previous
**Notification**: Both employee and supervisor alerted

---

## Sub-Tasks Feature (NEW)

### Purpose
Break down complex initiatives into manageable sub-tasks for better tracking.

### Structure
```
Initiative
  ├─ Sub-Task 1 (status: pending/completed)
  ├─ Sub-Task 2 (status: pending/completed)
  └─ Sub-Task 3 (status: pending/completed)
```

### Sub-Task Properties
- Title (required)
- Description (optional)
- Status: `PENDING`, `COMPLETED`
- Order/sequence number
- Completion timestamp
- Created by assignee (not supervisor)

### Workflow
1. Employee starts initiative (ONGOING status)
2. Employee creates sub-tasks to breakdown work
3. Employee marks sub-tasks as completed progressively
4. Initiative progress auto-calculated: (completed_subtasks / total_subtasks) × 100
5. When all sub-tasks completed → Employee can submit for review

### Rules
- Only assignees can create sub-tasks
- Sub-tasks can be added/edited while initiative is ONGOING
- Cannot modify sub-tasks when UNDER_REVIEW or COMPLETED
- Sub-task completion percentage shown on initiative card
- Optional: Can proceed without sub-tasks (legacy workflow)

### Data Model (NEW)
```sql
InitiativeSubTask table:
  id (UUID)
  initiative_id (FK → initiatives)
  title (string, required)
  description (text, optional)
  status (enum: pending, completed)
  sequence_order (int)
  completed_at (timestamp)
  created_by (FK → users)
  created_at, updated_at
```

---

## Detailed Workflows

### Employee-Created Initiative (Self-Assignment)
```
1. Employee creates initiative
   - Fills: title, description, due_date, urgency
   - Optional: links to goal, adds initial documents
   - Status: PENDING_APPROVAL

2. System sends notification to supervisor
   - Email: "Initiative approval request"
   - WebSocket: Real-time alert

3. Supervisor reviews
   Option A: APPROVE
     - Status → PENDING
     - Notification to employee

   Option B: REJECT
     - Provide rejection reason
     - Status → REJECTED
     - Notification to employee with reason

4. If approved, employee can:
   - Start initiative (PENDING → ONGOING)
   - Create sub-tasks
   - Upload documents
   - Track progress

5. Employee submits for review
   - Provide completion report
   - Attach final documents
   - Status → UNDER_REVIEW

6. Supervisor reviews submission
   - Views report + documents + sub-tasks
   - Assigns score (1-10)
   - Provides feedback

   Option A: APPROVE
     - Status → COMPLETED
     - Score saved
     - Performance metrics updated

   Option B: REQUEST REDO
     - Status → ONGOING
     - Employee revises based on feedback
     - Resubmits when ready

7. COMPLETED initiative
   - Archived in employee's completed work
   - Contributes to performance score
   - If linked to goal → Goal progress updated
```

---

### Supervisor-Assigned Initiative
```
1. Supervisor creates initiative
   - Fills: title, description, due_date, urgency
   - Selects assignee(s)
   - Optional: links to goal
   - Status: ASSIGNED (bypasses PENDING_APPROVAL)

2. System sends notification to assignee(s)
   - Email: "New initiative assigned"
   - WebSocket: Real-time alert

3. Employee responds
   Option A: ACCEPT
     - Status → PENDING
     - Can start work immediately

   Option B: DECLINE
     - Provide reason
     - Supervisor notified
     - Supervisor can reassign or revise

4. [Continue with steps 4-7 from employee-created flow]
```

---

### Group Initiative Workflow
```
1. Create group initiative
   - Select 2+ assignees
   - Designate one team head (must be from assignees)
   - All assignees notified

2. Team Head coordinates
   - Creates sub-tasks (visible to all members)
   - Tracks team progress
   - Communicates with supervisor

3. All assignees can:
   - View initiative details
   - Mark assigned sub-tasks complete
   - Upload documents

4. Team Head submits for review (on behalf of group)
   - Provides consolidated report
   - Status → UNDER_REVIEW

5. Supervisor reviews and scores
   - Single score for entire initiative
   - All assignees receive same score
   - Status → COMPLETED

6. Score applies to all assignees' performance
```

---

## Extension Request Workflow

### Trigger
- Due date approaching or passed
- Employee realizes cannot complete on time

### Process
```
1. Employee requests extension
   - Proposed new due date
   - Detailed reason
   - Status remains current (PENDING/ONGOING)
   - Extension status: PENDING

2. Supervisor receives notification
   - Email + WebSocket alert
   - Reviews request and reason

3. Supervisor decides
   Option A: APPROVE
     - Initiative due_date updated
     - Extension status: APPROVED
     - Employee notified
     - If was OVERDUE → Status back to ONGOING

   Option B: DENY
     - Extension status: DENIED
     - Provide reason
     - Employee notified
     - Must complete with original deadline or face OVERDUE

4. If OVERDUE with no pending extension
   - Employee blocked from submitting
   - Must request extension to proceed
```

---

## Document Management

### Upload Triggers
- During creation (initial docs)
- While ONGOING (progressive documentation)
- During submission (final deliverables)

### Rules
- Max 10 files per submission
- 25MB limit per file
- Supported formats: PDF, DOCX, XLSX, PNG, JPG, ZIP
- File paths stored securely in `backend/uploads/`
- Access control: Only creator, assignees, supervisor can download

---

## Goal Linkage

### Purpose
Link initiatives to goals to show alignment and contribute to goal progress.

### Workflow
1. When creating initiative, select linked goal (optional)
2. Initiative progress contributes to goal metrics
3. Completed initiatives with high scores boost goal progress
4. Supervisor sees which initiatives support which goals

---

## Notifications Required

### Real-time (WebSocket) + Email:
1. **Initiative Created (needs approval)** → Supervisor
2. **Initiative Assigned** → Assignee(s)
3. **Initiative Approved** → Employee
4. **Initiative Rejected** → Employee (with reason)
5. **Initiative Started** → Supervisor (FYI)
6. **Initiative Submitted for Review** → Supervisor
7. **Initiative Reviewed (Approved)** → Assignee(s) with score
8. **Initiative Reviewed (Redo)** → Assignee(s) with feedback
9. **Initiative Overdue** → Both employee and supervisor
10. **Extension Requested** → Supervisor
11. **Extension Approved/Denied** → Employee
12. **Sub-Task Completed** → Team head (for group initiatives) [optional]

---

## Performance Impact

### Scoring System
- Scale: 1-10
- Applied during final review (UNDER_REVIEW → COMPLETED)
- Stored in `Initiative.score` field

### Performance Calculation
- Average of all completed initiative scores
- Weighted by urgency (URGENT = 1.5x, HIGH = 1.2x, MEDIUM = 1.0x, LOW = 0.8x)
- Feeds into `PerformanceRecord.average_task_score`
- Quarterly and annual aggregation

---

## Supervisor Assessment Bias Note

**Current Limitation**: Initiative scoring is done solely by the creating/assigning supervisor. While this ensures accountability, it may introduce bias in assessments.

**Potential Solutions (Future Phase)**:
1. Multi-level review for high scores or disputes
2. Peer validation option for significant initiatives
3. Department head spot-checks on scores
4. Historical score normalization across supervisors
5. Anonymous peer feedback as supplementary input

**Current Mitigation**:
- Supervisors must provide written feedback with all scores
- Score and feedback visible to employee immediately
- HR can audit scoring patterns across supervisors
- Performance reviews incorporate multiple data sources (not just initiatives)
