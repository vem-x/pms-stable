# Nigcomsat Performance Management System
## User Guide: Goals & Initiatives

This guide explains how to use the Goals and Initiatives features in the Performance Management System.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Understanding Permissions & Scope](#2-understanding-permissions--scope)
3. [Goals Management](#3-goals-management)
4. [Initiatives Management](#4-initiatives-management)
5. [Quick Reference](#5-quick-reference)
6. [Glossary](#6-glossary)

---

## 1. Introduction

### What is the Performance Management System?

The Performance Management System (PMS) helps Nigcomsat track organizational and individual performance. It connects company-wide objectives to departmental goals and individual contributions, ensuring alignment across all levels.

### Accessing the System

Navigate to the system URL provided by your IT department and log in with your credentials.

**First-Time Users:** You will receive an onboarding email with a secure link to create your password. The link expires after a set period - contact HR if it has expired.

### Your Dashboard

After logging in, your dashboard displays:
- Active goals and initiatives
- Pending items requiring your attention
- Recent activity and notifications
- Quick actions for common tasks

The dashboard is customized based on your role and permissions.

---

## 2. Understanding Permissions & Scope

### Role-Based Access

Your role determines what you can see and do in the system. Roles are assigned by administrators based on your position.

| Role Type | Typical Capabilities |
|-----------|---------------------|
| Employee | View and manage personal goals, complete assigned initiatives |
| Supervisor | Create team goals, assign initiatives, review submissions, approve goals |
| Department Head | Manage departmental goals, oversee department activities |
| HR/Administrator | Manage users, roles, and organizational structure |
| Leadership | Create company-wide goals, view organization-wide data |

### Organizational Scope

Your access is also determined by your position in the 4-level organizational hierarchy:

```
Global (Company-wide)
    └── Directorate (e.g., Marketing, Operations)
            └── Department (e.g., HR, Finance)
                    └── Unit (Teams within departments)
```

- **Unit Level:** Access to your immediate team's data
- **Department Level:** Access to all units within your department
- **Directorate Level:** Access to all departments within your directorate
- **Global Level:** Access to the entire organization

### Leadership Roles

Users with leadership roles have additional capabilities:
- Create initiatives without requiring approval
- Directly assign initiatives to team members
- Approve goals and review submissions

### Scope Overrides

Some roles have special scope overrides that allow broader access regardless of organizational position. For example, HR may need company-wide access while being in a department-level position.

---

## 3. Goals Management

### 3.1 Goal Types & Scopes

Goals in the system have two distinct attributes:

**Goal Types (Duration):**
- **Yearly:** Long-term goals spanning a full year
- **Quarterly:** Medium-term goals for a specific quarter (Q1, Q2, Q3, Q4)

**Goal Scopes (Who they apply to):**
- **Company-Wide:** Apply to the entire organization
- **Departmental:** Specific to a department or directorate
- **Individual:** Personal goals for a specific employee

Any scope can be combined with any type. For example:
- A yearly individual goal
- A quarterly departmental goal
- A yearly company-wide goal

### 3.2 Goal Statuses

| Status | Meaning |
|--------|---------|
| PENDING_APPROVAL | Awaiting supervisor approval (Individual goals only) |
| ACTIVE | Approved and currently in progress |
| ACHIEVED | Successfully completed |
| DISCARDED | Cancelled or no longer relevant |
| REJECTED | Rejected by supervisor during approval |

### 3.3 Creating Goals

**Company-Wide Goals:**
- Requires `goal_create_yearly` or `goal_create_quarterly` permission
- Typically created by leadership/executive roles
- Visible across the organization

**Departmental Goals:**
- Requires `goal_create_departmental` permission
- Linked to a specific department or directorate
- Support company-wide goals through parent-child relationships

**Individual Goals:**
- Any employee can create goals for themselves
- Require approval from supervisor before becoming active
- Should align with departmental or company-wide goals

**To create a goal:**
1. Navigate to the **Goals** section
2. Click **Create New Goal**
3. Fill in required information:
   - Title and description
   - Type (Yearly or Quarterly)
   - Scope (Company-Wide, Departmental, or Individual)
   - Start and end dates
   - KPIs (Key Performance Indicators)
   - Parent goal (if supporting a higher-level goal)
4. Submit the goal

### 3.4 Goal Approval Workflow (Individual Goals Only)

Individual goals require approval before they become active:

```
Employee creates Individual goal
            ↓
    Status: PENDING_APPROVAL
            ↓
    Supervisor reviews
       ↓           ↓
    Approve      Reject
       ↓           ↓
    ACTIVE      REJECTED
```

**Note:** Company-Wide and Departmental goals do not require approval - they become ACTIVE immediately upon creation by users with appropriate permissions.

### 3.5 Supervisor Assigning Goals to Supervisees

Supervisors can create goals for their direct reports:
1. Create a new Individual goal
2. Select the supervisee as the goal owner
3. The supervisee receives notification
4. Supervisee can accept or decline the assigned goal

This is tracked through the Goal Assignment system.

### 3.6 Who Approves Individual Goals?

Goals can be approved by:
1. **The user's direct supervisor** (via `user.supervisor_id`)
2. **Any user with the `goal_approve` permission** within scope

### 3.7 Goal Progress & Achievement

**Manual Progress Updates:**
- For goals without child goals, progress can be updated manually
- Each update requires a progress report explaining what was accomplished
- Navigate to the goal → Update Progress → Enter percentage → Write report

**Automatic Achievement (Cascading Goals):**
- Goals can have parent-child relationships
- When ALL non-discarded child goals are achieved, the parent goal automatically achieves
- This creates a cascade effect from individual contributions up to company goals

**Goal Hierarchy Example:**
```
Company Yearly Goal (auto-achieves when children complete)
    ├── Q1 Goal (achieved)
    ├── Q2 Goal (achieved)
    └── Q3 Goal (achieved)
            └── Department Goal (achieved)
                    └── Individual Goal (achieved)
```

---

## 4. Initiatives Management

### 4.1 Initiative Types

**Individual Initiatives:**
- Assigned to a single person
- That person is fully responsible for completion and submission

**Group Initiatives:**
- Assigned to multiple team members (minimum 2)
- Requires a designated **Team Head** from the assignees
- Only the Team Head can submit on behalf of the group
- All group members can view the initiative and contribute

### 4.2 Initiative Statuses (Full Lifecycle)

| Status | Meaning | Who Acts Next |
|--------|---------|---------------|
| PENDING_APPROVAL | Created by non-leader, awaiting supervisor approval | Supervisor approves/rejects |
| ASSIGNED | Supervisor assigned, awaiting acceptance | Assignee accepts |
| PENDING | Ready to start work | Assignee starts work |
| ONGOING | Work actively in progress | Assignee submits when done |
| UNDER_REVIEW | Submitted for supervisor review | Creator/supervisor reviews |
| COMPLETED | Approved with final score | Done |
| REJECTED | Rejected during approval | May be revised and resubmitted |
| OVERDUE | Past due date | Request extension |

### 4.3 Creating Initiatives - Initial Status Rules

The initial status depends on who creates the initiative and for whom:

**If creator has a Leadership role:**
- Self-assigned initiative → **PENDING** (no approval needed, ready to start)
- Assigned to others → **ASSIGNED** (direct assignment, awaiting acceptance)

**If creator is a Regular Employee:**
- Self-assigned initiative → **PENDING_APPROVAL** (needs supervisor approval)
- Assigning to others (if supervisor) → **ASSIGNED**

### 4.4 Initiative Approval Workflow

**For PENDING_APPROVAL initiatives:**
```
Non-leader creates self-assigned initiative
                ↓
        PENDING_APPROVAL
                ↓
    Creator's supervisor reviews
         ↓              ↓
      Approve        Reject
         ↓              ↓
      PENDING       REJECTED
```

Only the creator's direct supervisor can approve PENDING_APPROVAL initiatives.

**For ASSIGNED initiatives:**
```
Supervisor assigns initiative
            ↓
        ASSIGNED
            ↓
    Assignee reviews
       ↓         ↓
    Accept    Decline
       ↓         ↓
    PENDING   (Returns to creator)
```

### 4.5 Working on Initiatives

**Starting Work:**
1. Open the initiative (must be in PENDING status)
2. Click **Start**
3. Status changes to **ONGOING**

**Working on the Initiative:**
- Complete the assigned work
- Add sub-tasks if needed to break down the work
- Attach documents as you progress

**Submitting Work:**
1. Open the initiative (must be in ONGOING status)
2. Click **Submit**
3. Write a completion report describing what was accomplished
4. Attach required documents
5. Status changes to **UNDER_REVIEW**

**Review Process:**
- The supervisor reviews the submission
- Assigns a score (1-10)
- Provides feedback
- Either approves (COMPLETED) or requests redo (back to ONGOING)

### 4.6 Group Initiative Rules

| Rule | Detail |
|------|--------|
| Minimum assignees | 2 people |
| Team Head | Must be selected from assigned group members |
| Submission | Only Team Head can submit on behalf of group |
| Extensions | Only Team Head can request deadline extensions |
| Visibility | All group members can view and contribute |

### 4.7 Who Approves/Reviews Initiatives?

| Action | Who Can Do It |
|--------|---------------|
| Initial Approval (PENDING_APPROVAL → PENDING) | Creator's direct supervisor only |
| Final Review (UNDER_REVIEW → COMPLETED) | Initiative creator OR supervisor |
| Extension Approval | Initiative creator only |

### 4.8 Deadline Extensions

**When to request:**
- When the initiative is overdue
- When anticipating you won't meet the deadline

**How to request:**
1. Open the initiative
2. Click **Request Extension**
3. Enter new proposed due date
4. Provide reason for the extension
5. Submit request

**Important:** While overdue, you cannot submit work until an extension is approved.

**Who approves:** Only the initiative creator can approve or deny extension requests.

---

## 5. Quick Reference

### Goal Permissions

| Permission | What It Allows |
|------------|----------------|
| `goal_create_yearly` | Create company-wide yearly goals |
| `goal_create_quarterly` | Create company-wide quarterly goals |
| `goal_create_departmental` | Create departmental scope goals |
| `goal_approve` | Approve individual goals (beyond just your supervisees) |
| `goal_edit` | Modify goal details |
| `goal_progress_update` | Update goal progress percentages |
| `goal_status_change` | Mark goals as achieved or discarded |
| `goal_view_all` | View all goals regardless of scope |
| `goal_freeze` | Freeze goals to prevent changes |

### Initiative Permissions

| Permission | What It Allows |
|------------|----------------|
| `initiative_create` | Create initiatives |
| `initiative_assign` | Assign initiatives to users |
| `initiative_edit` | Modify initiative details |
| `initiative_review` | Review and score submissions |
| `initiative_view_all` | View all initiatives in system |
| `initiative_extend_deadline` | Approve deadline extensions |
| `initiative_delete` | Delete initiatives |

### Status Color Guide

| Color | Statuses |
|-------|----------|
| Yellow/Orange | PENDING_APPROVAL, ASSIGNED - Waiting for action |
| Blue | ACTIVE, PENDING, ONGOING - In progress |
| Purple | UNDER_REVIEW - Being reviewed |
| Green | ACHIEVED, COMPLETED - Successfully done |
| Red | REJECTED, DISCARDED, OVERDUE - Ended or past due |

### Scoring Guidelines (Initiatives)

| Score Range | Meaning |
|-------------|---------|
| 1-3 | Below expectations, significant issues |
| 4-5 | Partially meets expectations, notable gaps |
| 6-7 | Meets expectations, competent work |
| 8-9 | Exceeds expectations, high quality |
| 10 | Exceptional, outstanding work |

### Common Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot create a goal | Check if you have the required permission for that goal type/scope |
| Goal stuck in PENDING_APPROVAL | Contact your supervisor to review and approve |
| Cannot submit initiative | Check if it's overdue - request extension first |
| Cannot find user to assign | User may be outside your scope, suspended, or on leave |
| Initiative shows ASSIGNED | You need to accept the initiative before starting work |

---

## 6. Glossary

| Term | Definition |
|------|------------|
| **Cascade** | The automatic achievement of parent goals when all child goals complete |
| **Directorate** | A major division of the organization (second level in hierarchy) |
| **Goal** | A specific, measurable objective to be achieved within a timeframe |
| **Goal Scope** | Who the goal applies to: Company-Wide, Departmental, or Individual |
| **Goal Type** | Duration of the goal: Yearly or Quarterly |
| **Initiative** | A specific task or piece of work that contributes to achieving goals |
| **KPI** | Key Performance Indicator - metrics used to measure goal progress |
| **Leadership Role** | A role that grants additional capabilities like bypassing approval workflows |
| **Parent Goal** | A higher-level goal that child goals support |
| **Permissions** | Specific actions a user is allowed to perform in the system |
| **Quarter** | A three-month period: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec) |
| **Role** | A set of permissions assigned to users based on their job function |
| **Scope** | The organizational boundary that limits what a user can access |
| **Scope Override** | Special permission that extends access beyond normal organizational boundaries |
| **Supervisor** | A user's direct manager who can approve their goals and review their work |
| **Team Head** | The designated coordinator for a group initiative who submits on behalf of the group |
| **Unit** | The smallest organizational level, typically a team within a department |

---

## Document Information

**Version:** 2.0
**Last Updated:** February 2026
**Applies To:** Nigcomsat Performance Management System - Goals & Initiatives Module

---

*For technical support, contact your IT Help Desk. For questions about goals or initiatives, contact your supervisor or HR department.*
