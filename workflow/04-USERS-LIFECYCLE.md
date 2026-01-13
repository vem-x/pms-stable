# Users Lifecycle & Workflow

## User Status States

### 1. PENDING_ACTIVATION
**Trigger**: User created by admin
**Meaning**: Account created but password not set
**Access**: Cannot login
**Actions**: Must use onboarding token to set password
**Duration**: Onboarding token valid for 7 days

### 2. ACTIVE
**Trigger**: Password set via onboarding OR admin activation
**Meaning**: Full system access
**Access**: Login allowed, can be assigned initiatives, create goals
**Visibility**: Appears in assignment lists, reports, dashboards

### 3. SUSPENDED
**Trigger**: Admin action (disciplinary, security, investigation)
**Meaning**: Temporary account lockout
**Access**: No login, no initiative assignments
**Visibility**: Hidden from assignment lists
**Actions**: Can be reactivated by admin

### 4. ON_LEAVE
**Trigger**: Employee on leave (vacation, medical, etc.)
**Meaning**: Account accessible but no new work assigned
**Access**: Can login and view (read-only mode)
**Visibility**: Hidden from new assignment lists
**Actions**: Existing initiatives remain visible but can't accept new ones

### 5. ARCHIVED
**Trigger**: Employee departure (resignation, termination, retirement)
**Meaning**: Historical record preservation
**Access**: No login, no system interaction
**Visibility**: Excluded from all operational views
**Data**: Historical data retained for compliance (initiatives, goals, reviews)

---

## User Creation & Onboarding Workflow

### Admin Creates User
```
1. Admin fills user form:
   - Personal info: name (first, middle, last), email, phone, address
   - Professional: job_title, skillset, level (1-17 civil service grade)
   - Organizational: organization, supervisor
   - Access: role (determines permissions)

2. System validates:
   - Email uniqueness
   - Admin's scope (can only create users in accessible orgs)
   - Role assignment permissions

3. User record created:
   - Status: PENDING_ACTIVATION
   - Onboarding token generated (secure random string)
   - Token expiration: 7 days from creation

4. Onboarding email sent:
   - Subject: "Welcome to Nigcomsat PMS - Set Up Your Password"
   - Content: Personalized welcome + secure link
   - Link format: /onboard?token={onboarding_token}
   - Template: Professional HTML email

5. Admin receives confirmation:
   - User created successfully
   - Email sent status
```

### Employee Onboarding
```
1. Employee receives email
   - Clicks onboarding link
   - Redirects to /onboard page

2. Onboarding page loads:
   - Validates token (checks expiration, single-use)
   - Shows user details (name, email, organization)
   - Password creation form

3. Employee sets password:
   - Password requirements: min 8 chars, 1 uppercase, 1 number
   - Confirm password validation
   - Submits form

4. System processes:
   - Password hashed (BCrypt)
   - Status → ACTIVE
   - Onboarding token invalidated
   - Email verified timestamp set

5. Success redirect:
   - Automatic login
   - JWT token generated
   - Redirect to dashboard
   - Welcome message displayed

6. Failure scenarios:
   - Token expired → Show error, provide "Request New Link" option
   - Token invalid → Show error, contact admin message
   - Token already used → Show "Account already activated" message
```

---

## User Profile Management

### Admin Edit User
**Permissions Required**: `user_edit`
**Scope**: Can only edit users in accessible organizations

**Editable Fields**:
- Personal info (name, phone, address)
- Professional info (job_title, skillset, level)
- Organization assignment (scope-limited)
- Role assignment (permission-limited)
- Supervisor assignment
- Status changes (separate permission)

**Restrictions**:
- Cannot change email (unique identifier)
- Cannot assign role with higher permissions than self
- Cannot move user to organization outside scope

**Audit Trail**:
- All changes logged to `user_history` table
- Old and new values stored as JSON
- Admin ID recorded
- Timestamp captured

---

### User Self-Edit
**Endpoint**: `PUT /api/users/me`
**Allowed Fields**:
- Phone, address, skillset
- Profile image upload
- Password change (with old password verification)

**Restricted Fields** (cannot self-edit):
- Name, email
- Organization, role, supervisor
- Status, level, job_title

---

## User Status Management

### Activate User
**Trigger**: Admin action on PENDING_ACTIVATION or SUSPENDED user
**Effect**: Status → ACTIVE
**Notification**: Email to user (account activated)
**Use Cases**:
- Complete onboarding if email missed
- Reactivate suspended user

---

### Suspend User
**Trigger**: Admin action (disciplinary)
**Effect**: Status → SUSPENDED
**Impact**:
- Immediate logout (JWT invalidated)
- Cannot login
- Removed from assignment lists
- Existing initiatives remain but cannot progress
**Notification**: Email to user (account suspended with reason)
**Audit**: Logged with reason

---

### Mark On Leave
**Trigger**: Admin action (leave management)
**Effect**: Status → ON_LEAVE
**Impact**:
- Can still login (view only)
- Hidden from new initiative assignments
- Cannot create new initiatives
- Existing initiatives frozen until return
**Notification**: Email to user (leave status confirmed)
**Return Process**: Admin changes status back to ACTIVE

---

### Archive User
**Trigger**: Admin action (employee departure)
**Effect**: Status → ARCHIVED
**Impact**:
- Cannot login (permanent)
- All access revoked
- Historical data retained:
  - Completed initiatives (with scores)
  - Achieved goals
  - Performance reviews
  - Audit trail
- Supervisor relationship severed
- Subordinates reassigned to new supervisor
**Notification**: Email to user (account archived)
**Data Retention**: Permanent for compliance

---

## Supervisor Relationship Management

### Assign Supervisor
**Purpose**: Establish reporting chain for approval workflows
**Rules**:
- Supervisor must be in same or parent organization
- Cannot create circular reporting (A supervises B, B supervises A)
- Supervisor must have ACTIVE status
- One supervisor per user (no matrix reporting)

**Impact**:
- Supervisor receives approval requests for:
  - Employee-created individual goals
  - Employee-created initiatives (if self-assigned)
- Supervisor can:
  - Create goals for subordinate
  - Assign initiatives to subordinate
  - Review subordinate's initiative submissions
  - Access subordinate's performance data

---

### Change Supervisor
**Trigger**: Organizational restructure or role change
**Process**:
1. Admin selects new supervisor
2. System validates new supervisor
3. Pending approvals transferred to new supervisor (optional)
4. Notification sent to both old and new supervisor
5. Employee notified of change
6. Audit trail logged

---

## User Search & Filtering

### Search Criteria
- Name (first, last, full)
- Email
- Job title
- Organization
- Role
- Status
- Supervisor

### Scope Filtering
- Users only see users in accessible organizations
- `user_view_all` permission bypasses scope
- Supervisors always see their subordinates

---

## User Bulk Operations

### Bulk Status Change
**Use Case**: Mass leave (holidays), mass suspension (policy violation)
**Process**:
1. Select multiple users (checkboxes)
2. Choose new status
3. Provide reason (for suspension/archive)
4. Confirm action
5. System processes:
   - Status updated for all selected
   - Notifications sent to each user
   - Audit trail for each change
6. Summary report shown (success/failures)

---

### Bulk Role Assignment
**Use Case**: Department-wide role change
**Process**: Similar to bulk status change
**Validation**: Admin must have permission to assign each role

---

## User History & Audit Trail

### Tracked Actions
- `role_change` - Role assignment changes
- `status_change` - Status updates (with before/after)
- `profile_edit` - Personal/professional info changes
- `organization_change` - Organizational reassignment
- `supervisor_change` - Supervisor reassignment
- `password_reset` - Password reset events

### History View
**Endpoint**: `GET /api/users/{id}/history`
**Permission**: `user_history_view`
**Display**:
- Chronological list
- Action type
- Old vs new values (side-by-side)
- Admin who made change
- Timestamp
- Reason (if provided)

---

## User Permissions System

### Permission Categories
1. **Organization**: create, edit, delete, view_all
2. **Role**: create, edit, delete, assign, view_all
3. **User**: create, edit, suspend, activate, on_leave, archive, view_all, history_view
4. **Goal**: create_yearly, create_quarterly, create_departmental, edit, approve, freeze
5. **Initiative**: create, assign, edit, review, view_all, delete
6. **Review**: create_cycle, manage_cycle, conduct, view_all
7. **Performance**: view_all, edit
8. **System**: admin, reports_generate, audit_access, notification_manage

### Scope Overrides
- **NONE**: Access limited to user's organization + children
- **GLOBAL**: Access all organizations (HR use case)
- **CROSS_DIRECTORATE**: Access across directorates (multi-division roles)

### Permission Checks
- Every API call validates user permissions
- Scope filtering applied to all queries
- Leadership flag grants approval rights within scope

---

## Notifications for Users

### Email Notifications:
1. **Onboarding** - Welcome email with password setup link
2. **Password Reset** - Secure link to reset password
3. **Status Changed** - Notification of status change with reason
4. **Role Changed** - Notification of role/permission changes
5. **Supervisor Changed** - Notification of reporting line change
6. **Profile Updated** - Confirmation of profile changes (optional)

### Real-time (WebSocket):
1. **New Initiative Assigned** - Immediate alert
2. **Goal Assigned** - Immediate alert
3. **Approval Requests** - For supervisors
4. **Status Changes** - For all users

---

## User Dashboard Views

### Employee Dashboard
- My initiatives (created, assigned, in progress)
- My goals (organizational, departmental, individual)
- Upcoming deadlines
- Pending actions (approvals to give/receive)
- Performance summary
- Quick actions (create goal, view calendar)

### Supervisor Dashboard
- My initiatives + My team's initiatives
- My goals + Team goals
- Pending approvals (goals, initiatives)
- Team performance overview
- Team member list with statuses
- Quick actions (assign initiative, review submissions)

### Admin Dashboard
- All users (with scope filtering)
- System statistics (active users, pending activations)
- Recent user changes (audit trail)
- Bulk actions
- User management tools
