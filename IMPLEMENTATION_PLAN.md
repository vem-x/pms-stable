# Goals & Notifications System Implementation Plan

## Overview
Redesign of goals and notifications with supervisor-supervisee workflows

## Goal System Changes

### 1. Two Types of Goals
- **Organizational Goals** (YEARLY, QUARTERLY)
  - Only users with `goal_create_yearly` or `goal_create_quarterly` permissions can create
  - Visible to all users but non-editable
  - No approval workflow needed

- **Personal/Individual Goals** (INDIVIDUAL)
  - Any user can create for themselves
  - Requires supervisor approval before becoming ACTIVE
  - Status flow: PENDING_APPROVAL → ACTIVE (approved) or REJECTED (rejected)

### 2. Supervisor-Created Goals
- Supervisor can create goals and assign to supervisees
- Creates GoalAssignment record
- Supervisee must accept or decline
- Status flow: PENDING_APPROVAL → ACTIVE (accepted) or REJECTED (declined)

### 3. Supervisor Dashboard Features
- View all supervisee goals
- Approve/reject pending personal goals
- Create and assign goals to supervisees
- Track supervisee goal progress

## Notification System

### Database Tables (COMPLETED)
✅ `notifications` - Main notification table
✅ `goal_assignments` - Track supervisor-assigned goals

### Notification Types
- Goal: created, assigned, approved, rejected, accepted, declined
- Initiative: created, assigned, submitted, reviewed, overdue, extension requests
- Review: assigned, due soon, overdue, submitted
- User: created, status changed, role changed
- System: announcements

### Features
- Real-time in-app notifications
- Mark as read/unread
- Notification bell with unread count
- Priority levels (low, medium, high, urgent)
- Action URLs for quick navigation
- Auto-expire old notifications

## Implementation Steps

### Backend

#### Step 1: Database Migration ✅
- Added Notification model
- Added GoalAssignment model
- Added NotificationType and NotificationPriority enums

#### Step 2: Schemas ✅
- Created notification schemas

#### Step 3: Notification Service (IN PROGRESS)
- Update existing service to persist to database
- Add methods for all notification types

#### Step 4: Notification API Router (PENDING)
- GET /api/notifications - List user notifications
- GET /api/notifications/stats - Notification statistics
- PUT /api/notifications/{id}/read - Mark as read
- PUT /api/notifications/mark-all-read - Mark all as read
- DELETE /api/notifications/{id} - Delete notification

#### Step 5: Goal API Updates (PENDING)
- POST /api/goals - Create goal (personal or organizational)
  - If personal: status = PENDING_APPROVAL, notify supervisor
  - If organizational: requires permission check
- POST /api/goals/assign - Supervisor assigns goal to supervisee
- PUT /api/goals/{id}/approve - Supervisor approves personal goal
- PUT /api/goals/{id}/reject - Supervisor rejects personal goal
- PUT /api/goals/{id}/accept - Supervisee accepts assigned goal
- PUT /api/goals/{id}/decline - Supervisee declines assigned goal
- GET /api/goals/supervisee-goals - Get all supervisee goals (for supervisors)
- GET /api/goals/pending-approval - Get goals awaiting my approval

### Frontend

#### Step 1: Notification Components (PENDING)
- NotificationBell - Bell icon with unread count
- NotificationDropdown - List of recent notifications
- NotificationCenter - Full notification page

#### Step 2: Goal UI Updates (PENDING)
- Hide organizational goal creation for non-authorized users
- Add goal approval UI for supervisors
- Add goal accept/decline UI for supervisees
- Add supervisor dashboard with supervisee goals
- Filter goals by: my goals, assigned to me, supervisee goals

#### Step 3: Real-time Updates (PENDING)
- Polling or WebSocket for new notifications
- Toast notifications for important events

## Permissions Required

### Goal Permissions
- `goal_create_yearly` - Create yearly organizational goals
- `goal_create_quarterly` - Create quarterly organizational goals
- `goal_create_departmental` - Create departmental organizational goals (if kept)
- Personal goals - all users can create (no special permission)

### Notification Permissions
- All users can view their own notifications
- No special permissions needed

## Database Schema Summary

### notifications
```sql
id: UUID
type: NotificationType
priority: NotificationPriority
title: VARCHAR(255)
message: TEXT
action_url: VARCHAR(500)
data: JSON
is_read: BOOLEAN
read_at: TIMESTAMP
created_at: TIMESTAMP
expires_at: TIMESTAMP
user_id: UUID (FK users)
triggered_by: UUID (FK users)
```

### goal_assignments
```sql
id: UUID
status: GoalStatus
response_message: TEXT
assigned_at: TIMESTAMP
responded_at: TIMESTAMP
goal_id: UUID (FK goals)
assigned_by: UUID (FK users - supervisor)
assigned_to: UUID (FK users - supervisee)
```

## Testing Checklist
- [ ] User creates personal goal → supervisor gets notification
- [ ] Supervisor approves goal → user gets notification
- [ ] Supervisor rejects goal → user gets notification
- [ ] Supervisor creates and assigns goal → user gets notification
- [ ] User accepts assigned goal → supervisor gets notification
- [ ] User declines assigned goal → supervisor gets notification
- [ ] Non-authorized user cannot see organizational goal creation options
- [ ] Supervisor can view all supervisee goals
- [ ] Notification bell shows unread count
- [ ] Clicking notification navigates to correct page
- [ ] Mark as read updates UI immediately
