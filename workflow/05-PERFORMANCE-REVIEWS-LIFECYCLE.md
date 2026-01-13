# Performance Reviews Lifecycle & Workflow

## Overview
Performance reviews are conducted in structured **Review Cycles** that automate the scheduling, collection, and aggregation of multi-source feedback.

## Review Types

### 1. SELF Review
**Reviewer**: Employee (self-assessment)
**Purpose**: Self-reflection on performance, achievements, challenges
**Weight**: 20% in final score

### 2. SUPERVISOR Review
**Reviewer**: Direct supervisor
**Purpose**: Manager assessment of employee performance
**Weight**: 50% in final score

### 3. PEER Review
**Reviewer**: Colleagues selected by employee or supervisor
**Purpose**: 360-degree feedback from co-workers
**Weight**: 30% in final score

### 4. SUBORDINATE Review
**Reviewer**: Direct reports (optional, for leaders)
**Purpose**: Upward feedback on leadership effectiveness
**Weight**: Variable (used for leadership assessment only)

### 5. 360 (Multi-source) Review
**Reviewers**: Combination of self, supervisor, peers, subordinates
**Purpose**: Comprehensive feedback from all stakeholder perspectives
**Weight**: Composite of all review types

---

## Review Cycle Lifecycle

### Cycle Types
1. **QUARTERLY** - Every 3 months (Q1, Q2, Q3, Q4)
2. **ANNUAL** - Once per year (typically FY end)
3. **PROBATIONARY** - For new hires (3-6 months)
4. **PROJECT** - End of major project

### Cycle Statuses
```
DRAFT → SCHEDULED → ACTIVE → COMPLETED
           ↓
       CANCELLED (can cancel before ACTIVE)
```

---

## Review Cycle Creation Workflow

### Step 1: Define Cycle
```
Admin creates review cycle:
- Name (e.g., "Q1 2024 Performance Review")
- Type (quarterly, annual, probationary, project)
- Period identifier (Q1-2024, FY-2024)
- Start date, end date
- Status: DRAFT
```

### Step 2: Configure Participants
```
Inclusion Criteria (JSON):
- Departments/Directorates (specific orgs)
- Roles (specific roles)
- Employee levels (grade levels)
- Status (ACTIVE only, or include ON_LEAVE)

Exclusion Criteria:
- Probationary employees (< 3 months tenure)
- Suspended/Archived users
- Specific user IDs

Mandatory Participants:
- Leadership team
- High performers
- Special cases
```

### Step 3: Configure Components
```
Review Components & Weights:
{
  "self_review": {
    "weight": 0.2,
    "required": true,
    "deadline": "2024-03-15"
  },
  "supervisor_review": {
    "weight": 0.5,
    "required": true,
    "deadline": "2024-03-20"
  },
  "peer_review": {
    "weight": 0.3,
    "required": true,
    "num_peers": 3,
    "deadline": "2024-03-18"
  },
  "goals_achievement": {
    "weight": 0.4,
    "auto_calculated": true
  },
  "initiative_performance": {
    "weight": 0.6,
    "auto_calculated": true
  }
}
```

### Step 4: Select Review Traits
```
Traits to evaluate (select from trait library):
- Communication Skills
- Technical Competence
- Leadership Ability
- Teamwork & Collaboration
- Problem Solving
- Innovation & Creativity
- Reliability
- Time Management
- Customer Focus
- Adaptability

Each trait has associated questions (1-5 rating scale)
```

### Step 5: Configure Phase Schedule
```
Phase Timeline (JSON):
{
  "nomination": {
    "start": "2024-03-01",
    "end": "2024-03-05",
    "description": "Employees nominate peer reviewers"
  },
  "review_period": {
    "start": "2024-03-06",
    "end": "2024-03-20",
    "description": "Review submissions"
  },
  "calibration": {
    "start": "2024-03-21",
    "end": "2024-03-25",
    "description": "Management calibration sessions"
  },
  "feedback": {
    "start": "2024-03-26",
    "end": "2024-03-31",
    "description": "Feedback delivery to employees"
  }
}
```

### Step 6: Set Buffer Time
```
Grace period for late submissions:
- 1 week (default)
- 3 days
- No buffer (hard deadline)
```

### Step 7: Configure AI Assistance (Optional)
```
AI Configuration:
{
  "enabled": true,
  "features": [
    "sentiment_analysis",
    "strength_identification",
    "development_areas",
    "career_recommendations"
  ],
  "insight_generation": true
}
```

### Step 8: Approval Workflow
```
Multi-level approval for final scores:
Level 1: Direct supervisor
Level 2: Department head
Level 3: HR review (optional)
```

### Step 9: Save & Schedule
```
- Save as DRAFT (can edit later)
- OR Publish → Status becomes SCHEDULED
- System will auto-activate on start_date
```

---

## Review Cycle Execution

### Automatic Activation (start_date arrives)
```
Scheduled task runs daily:
1. Check for cycles where start_date = today
2. For each:
   - Status → ACTIVE
   - Generate review assignments for all participants
   - Create ReviewAssignment records
   - Send notifications (email + WebSocket)
```

### Review Assignment Creation
```
For each participant in cycle:
1. Create SELF review assignment
   - reviewer_id = reviewee_id
   - type = SELF
   - status = pending
   - deadline = self_review deadline

2. Create SUPERVISOR review assignment
   - reviewer_id = participant.supervisor_id
   - reviewee_id = participant.id
   - type = SUPERVISOR
   - status = pending
   - deadline = supervisor_review deadline

3. Create PEER review assignments (if configured)
   - Select peers (employee nomination or auto-assign)
   - Create assignment for each peer
   - type = PEER
   - status = pending
   - deadline = peer_review deadline

4. Create SUBORDINATE assignments (if leader)
   - For each subordinate of participant
   - type = SUBORDINATE
   - status = pending
```

### Notifications Sent
- **To reviewees**: "Performance review cycle started"
- **To reviewers**: "You have been assigned to review {name}"
- **To supervisors**: "Performance reviews available for your team"

---

## Individual Review Completion Workflow

### Employee Completes Self-Review
```
1. Employee logs in → Sees pending review alert
2. Clicks "Complete Review" → Review form opens
3. Form displays:
   - Selected traits with questions
   - Rating scale (1-5 for each question)
   - Comment box for each trait
   - Overall self-assessment text area
   - Goals achievement section (auto-populated)
   - Initiative performance section (auto-populated)

4. Employee fills form:
   - Must answer all required questions
   - Optional comments encouraged
   - Can save draft (partial progress)
   - Can resume later

5. Employee clicks "Submit"
   - Validation: All required fields filled
   - Confirmation modal: "Are you sure? Cannot edit after submission."
   - Status: pending → in_progress → submitted
   - Timestamp: submitted_at captured
   - Notification: Supervisor notified

6. AI processing (if enabled):
   - Sentiment analysis on comments
   - Strength/weakness identification
   - Store insights in review.ai_insights
```

### Supervisor Completes Review
```
1. Supervisor receives notification
2. Supervisor dashboard shows pending reviews
3. Supervisor clicks on employee → Review form
4. Form displays:
   - Employee's self-review (read-only) for reference
   - Same traits and questions
   - Rating scale (1-5)
   - Comment requirement (mandatory feedback)
   - Goals achievement (auto-populated, can adjust)
   - Initiative scores (auto-populated from submissions)

5. Supervisor fills form:
   - Rates each trait
   - Provides detailed comments
   - Reviews auto-calculated metrics
   - Can add overall summary

6. Supervisor submits
   - Status → submitted
   - Notification: Employee notified (completion pending all reviews)

7. If multi-level approval configured:
   - Status → pending_approval
   - Department head receives approval request
   - Can approve or send back for revision
```

### Peer Completes Review
```
1. Peer receives notification
2. Peer dashboard shows review assignment
3. Form displays:
   - Only relevant traits (teamwork, collaboration, communication)
   - Rating scale (1-5)
   - Optional comments
   - Anonymous option available

4. Peer submits
   - Status → submitted
   - Aggregated with other peer reviews
   - Individual peer identity hidden from reviewee (unless disclosed)
```

---

## Review Aggregation & Scoring

### Automatic Score Calculation
```
For each trait:
1. Collect all review responses:
   - Self rating (weight: 0.2)
   - Supervisor rating (weight: 0.5)
   - Average peer rating (weight: 0.3)
   - Average subordinate rating (if applicable)

2. Calculate weighted score:
   weighted_score = (self × 0.2) + (supervisor × 0.5) + (peers × 0.3)

3. Store in ReviewScore table:
   - cycle_id, user_id, trait_id
   - self_score, supervisor_score, peer_score, weighted_score
```

### Overall Performance Score
```
1. Average all trait weighted scores → Base Score (40% weight)

2. Add auto-calculated metrics:
   - Goals achievement rate (30% weight)
   - Initiative completion rate (20% weight)
   - Average initiative score (10% weight)

3. Final Formula:
   performance_score =
     (trait_scores_avg × 0.4) +
     (goals_achievement × 0.3) +
     (initiative_completion × 0.2) +
     (initiative_avg_score × 0.1)

4. Map to rating scale:
   - 4.5-5.0 → Outstanding
   - 3.5-4.4 → Exceeds Expectations
   - 2.5-3.4 → Meets Expectations
   - 1.5-2.4 → Below Expectations
   - 0.0-1.4 → Unsatisfactory
```

---

## Calibration Session

### Purpose
Ensure consistency in scoring across departments and supervisors.

### Workflow
```
1. After review period ends:
   - All reviews submitted
   - Initial scores calculated

2. HR schedules calibration meeting:
   - Invites: All department heads, HR leadership
   - Reviews: Score distribution across departments

3. During calibration:
   - Identify outliers (unusually high/low scores)
   - Discuss justifications
   - Adjust scores if needed (with documented reason)
   - Ensure fairness across organization

4. Finalize scores:
   - Lock reviews (no further edits)
   - Generate performance records
   - Status → awaiting_feedback
```

---

## Feedback Delivery

### Supervisor-Employee Meeting
```
1. Supervisor schedules 1-on-1 meeting
2. Supervisor shares:
   - Overall performance rating
   - Trait-by-trait scores
   - Strengths identified
   - Development areas
   - Goal achievement review
   - Initiative performance review
   - Peer feedback themes (anonymized)

3. Two-way discussion:
   - Employee asks questions
   - Supervisor provides context
   - Discuss development plan
   - Set goals for next period

4. Employee acknowledges:
   - Signs off on review (electronic signature)
   - Can add employee comments
   - Status → completed

5. Follow-up:
   - Development plan created (if needed)
   - Goals for next quarter/year set
   - Regular check-ins scheduled
```

---

## Review Cycle Completion

### Automatic Completion (end_date passes)
```
Scheduled task runs daily:
1. Check for cycles where end_date = today
2. For each:
   - Calculate completion_rate: (submitted_reviews / total_assignments) × 100
   - Calculate quality_score: Average of all review completeness metrics
   - Status → COMPLETED
   - Generate final reports
   - Archive cycle data

3. Notifications:
   - HR: Cycle completion summary
   - Supervisors: Pending feedback reminders
```

---

## Data Model

### ReviewCycle
```
id, name, type, period
start_date, end_date
phase_schedule (JSON)
components (JSON with weights)
inclusion_criteria, exclusion_criteria
ai_assistance, calibration_sessions
status, participants_count, completion_rate
```

### ReviewAssignment
```
id, cycle_id, reviewer_id, reviewee_id
review_type (self, peer, supervisor, subordinate)
status (pending, in_progress, completed, overdue)
deadline, completed_at
```

### Review
```
id, cycle_id, reviewee_id, reviewer_id
type, responses (JSON), status
completion_percentage, time_spent
ai_insights (JSON)
submitted_at
```

### ReviewTrait
```
id, name, description
scope_type (global, directorate, department)
organization_id (for scoped traits)
is_active, display_order
```

### ReviewQuestion
```
id, trait_id, question_text
applies_to_self, applies_to_peer, applies_to_supervisor
is_active
```

### ReviewScore
```
id, cycle_id, user_id, trait_id
self_score, peer_score, supervisor_score
weighted_score
```

### PerformanceRecord
```
id, user_id, period (Q1-2024, FY-2024)
overall_rating (enum)
goal_achievement_rate, task_completion_rate
average_task_score, peer_feedback_score
competency_scores (JSON: technical, leadership, communication, teamwork, innovation)
strengths (array), development_areas (array)
achievements (array), feedback_summary (text)
```

---

## Notifications Required

### Email + WebSocket:
1. **Review Cycle Started** → All participants
2. **Review Assignment** → Each reviewer
3. **Review Due Soon** → Reviewers with pending reviews (3 days before deadline)
4. **Review Overdue** → Reviewers who missed deadline
5. **Review Submitted** → Reviewee (when all reviews complete)
6. **Calibration Scheduled** → Department heads
7. **Feedback Available** → Employees (when supervisor completes feedback meeting)
8. **Review Cycle Completed** → HR and all participants

---

## Reporting & Analytics

### Individual Report
- Overall performance score & rating
- Trait breakdown (self vs supervisor vs peers)
- Goals achievement rate
- Initiative completion & scores
- Strengths & development areas
- Historical trend (compare to previous cycles)

### Department Report
- Average performance rating
- Distribution (outstanding, exceeds, meets, below, unsatisfactory)
- Top performers
- Development needs
- Completion rate

### Organization-wide Report
- Company average rating
- Department comparisons
- Leadership effectiveness scores
- Peer feedback themes
- Goal/initiative alignment
