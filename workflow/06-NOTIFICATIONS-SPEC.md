# Notifications Specification

## Notification Architecture

### Dual Delivery System
1. **Database Persistence** - All notifications stored in `notifications` table
2. **Real-time WebSocket** - Instant push when user connected
3. **Email** - Important events sent via Resend API

### Current Implementation Status
- ✅ WebSocket infrastructure (websocket_manager.py)
- ✅ Notification service with database persistence
- ✅ Email service with basic templates
- ⚠️ Limited email templates (only 5 templates exist)
- ⚠️ Not all events trigger emails
- ❌ Email templates missing for many events

---

## Notification Types & Priorities

### Initiative Notifications
| Event | Type | Priority | Email | WebSocket | Status |
|-------|------|----------|-------|-----------|--------|
| Initiative created (needs approval) | INITIATIVE_CREATED | HIGH | ⚠️ Partial | ✅ Yes | Email needs template |
| Initiative assigned | INITIATIVE_ASSIGNED | HIGH | ✅ Done | ✅ Yes | Complete |
| Initiative approved | INITIATIVE_APPROVED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Initiative rejected | INITIATIVE_REJECTED | HIGH | ❌ Missing | ✅ Yes | Need email |
| Initiative started | INITIATIVE_STARTED | LOW | ❌ Missing | ✅ Yes | Optional email |
| Initiative submitted for review | INITIATIVE_SUBMITTED | HIGH | ✅ Done | ✅ Yes | Complete |
| Initiative reviewed (approved) | INITIATIVE_COMPLETED | HIGH | ✅ Done | ✅ Yes | Complete |
| Initiative reviewed (redo) | INITIATIVE_REDO | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Initiative overdue | INITIATIVE_OVERDUE | CRITICAL | ❌ Missing | ✅ Yes | Need email |
| Extension requested | EXTENSION_REQUESTED | HIGH | ❌ Missing | ✅ Yes | Need email |
| Extension approved | EXTENSION_APPROVED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Extension denied | EXTENSION_DENIED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Sub-task completed | SUBTASK_COMPLETED | LOW | ❌ Missing | ✅ Yes | Optional |

### Goal Notifications
| Event | Type | Priority | Email | WebSocket | Status |
|-------|------|----------|-------|-----------|--------|
| Goal created | GOAL_CREATED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Goal assigned to employee | GOAL_ASSIGNED | HIGH | ❌ Missing | ✅ Yes | Need email |
| Goal needs approval | GOAL_PENDING_APPROVAL | HIGH | ❌ Missing | ✅ Yes | Need email |
| Goal approved | GOAL_APPROVED | HIGH | ❌ Missing | ✅ Yes | Need email |
| Goal rejected | GOAL_REJECTED | HIGH | ❌ Missing | ✅ Yes | Need email |
| Goal accepted (by employee) | GOAL_ACCEPTED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Goal declined (by employee) | GOAL_DECLINED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Progress updated | GOAL_PROGRESS_UPDATED | LOW | ❌ Missing | ✅ Yes | Optional |
| Goal achieved | GOAL_ACHIEVED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Goal auto-achieved (cascade) | GOAL_AUTO_ACHIEVED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Goal discarded | GOAL_DISCARDED | LOW | ❌ Missing | ✅ Yes | Optional |
| Goal frozen | GOAL_FROZEN | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Goal deadline approaching | GOAL_DUE_SOON | MEDIUM | ❌ Missing | ✅ Yes | Need email |

### User Notifications
| Event | Type | Priority | Email | WebSocket | Status |
|-------|------|----------|-------|-----------|--------|
| User created (onboarding) | USER_CREATED | HIGH | ✅ Done | ✅ Yes | Complete |
| Password reset requested | PASSWORD_RESET | HIGH | ✅ Done | ✅ Yes | Complete |
| User status changed | USER_STATUS_CHANGED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Role changed | USER_ROLE_CHANGED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Supervisor changed | SUPERVISOR_CHANGED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Profile updated | PROFILE_UPDATED | LOW | ❌ Missing | ✅ Yes | Optional |

### Review Notifications
| Event | Type | Priority | Email | WebSocket | Status |
|-------|------|----------|-------|-----------|--------|
| Review cycle started | REVIEW_CYCLE_STARTED | HIGH | ❌ Missing | ✅ Yes | Need email |
| Review assigned | REVIEW_ASSIGNED | HIGH | ❌ Missing | ✅ Yes | Need email |
| Review due soon (3 days) | REVIEW_DUE_SOON | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Review overdue | REVIEW_OVERDUE | HIGH | ❌ Missing | ✅ Yes | Need email |
| Review submitted | REVIEW_SUBMITTED | LOW | ❌ Missing | ✅ Yes | Optional |
| Feedback available | FEEDBACK_AVAILABLE | HIGH | ❌ Missing | ✅ Yes | Need email |
| Review cycle completed | REVIEW_CYCLE_COMPLETED | MEDIUM | ❌ Missing | ✅ Yes | Need email |
| Calibration scheduled | CALIBRATION_SCHEDULED | HIGH | ❌ Missing | ✅ Yes | Need email |

---

## Email Templates Required

### Current Templates (5)
1. ✅ Onboarding email (welcome + password setup)
2. ✅ Password reset email
3. ✅ Task assignment email
4. ✅ Task submitted email
5. ✅ Task reviewed email

### Missing Templates (30+)

#### Initiative Templates
1. **Initiative Approval Request** (to supervisor)
2. **Initiative Approved** (to employee)
3. **Initiative Rejected** (to employee with reason)
4. **Initiative Overdue** (to employee + supervisor)
5. **Extension Request** (to supervisor)
6. **Extension Approved** (to employee)
7. **Extension Denied** (to employee with reason)
8. **Initiative Redo Request** (to employee with feedback)

#### Goal Templates
9. **Goal Assigned** (to employee by supervisor)
10. **Goal Approval Request** (to supervisor)
11. **Goal Approved** (to employee)
12. **Goal Rejected** (to employee with reason)
13. **Goal Achieved** (to employee + supervisor)
14. **Goal Auto-Achieved** (to parent goal owner - cascade)
15. **Goal Frozen** (to all goal owners in quarter)
16. **Goal Deadline Approaching** (reminder)

#### User Templates
17. **Status Changed - Suspended** (to employee)
18. **Status Changed - Activated** (to employee)
19. **Status Changed - On Leave** (to employee)
20. **Status Changed - Archived** (to employee)
21. **Role Changed** (to employee with new permissions)
22. **Supervisor Changed** (to employee, old supervisor, new supervisor)

#### Review Templates
23. **Review Cycle Started** (to all participants)
24. **Review Assigned** (to reviewer)
25. **Review Due Soon** (reminder to reviewer)
26. **Review Overdue** (to reviewer + their supervisor)
27. **All Reviews Completed** (to reviewee)
28. **Feedback Available** (to reviewee)
29. **Calibration Meeting Scheduled** (to department heads)
30. **Review Cycle Completed** (to all participants + HR)

---

## Email Template Design Guidelines

### Structure
```html
Header (gradient background with logo)
   ↓
Content (white background, clear typography)
   ↓
Call-to-Action Button (prominent, colorful)
   ↓
Footer (gray background, copyright, contact)
```

### Components
1. **Personalization**: Use recipient name
2. **Context**: Brief explanation of event
3. **Action Required**: Clear CTA (if applicable)
4. **Details Box**: Key information (due date, reason, score, etc.)
5. **Link**: Deep link to relevant page in app
6. **Fallback**: Copy-paste URL for link
7. **Warning/Info**: Additional context (security notice, deadline, etc.)

### Color Coding
- **Positive** (approved, achieved): Green (#10b981)
- **Negative** (rejected, overdue): Red (#ef4444)
- **Warning** (due soon, needs action): Orange (#f59e0b)
- **Info** (assigned, created): Blue (#3b82f6)
- **Neutral** (status change): Purple (#8b5cf6)

### Mobile Responsive
- Max-width: 600px
- Single column layout
- Large touch targets (buttons)
- Readable font sizes (16px minimum)

---

## WebSocket Implementation

### Connection Flow
```
1. User logs in → JWT token obtained
2. Frontend connects to WebSocket: ws://api/notifications/ws?token={jwt}
3. Backend validates JWT
4. Connection added to WebSocketManager for user_id
5. User receives real-time notifications while connected
```

### Message Format
```json
{
  "type": "new_notification",
  "notification": {
    "id": "uuid",
    "type": "INITIATIVE_ASSIGNED",
    "priority": "HIGH",
    "title": "New Initiative Assigned",
    "message": "John Doe assigned you initiative 'Update Documentation'",
    "action_url": "/dashboard/initiatives/uuid",
    "data": {
      "initiative_id": "uuid",
      "initiative_title": "Update Documentation"
    },
    "triggered_by_name": "John Doe",
    "created_at": "2024-03-10T10:30:00Z",
    "is_read": false
  }
}
```

### Frontend Handling
```javascript
// Connect to WebSocket
const ws = new WebSocket(`ws://api/notifications/ws?token=${token}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_notification') {
    // Show toast notification
    toast.info(data.notification.title, {
      description: data.notification.message,
      action: {
        label: 'View',
        onClick: () => navigate(data.notification.action_url)
      }
    });

    // Update notification bell count
    updateNotificationCount();

    // Play sound (optional)
    playNotificationSound();
  }
};
```

---

## Notification Preferences (Future)

Allow users to customize:
- Email frequency (immediate, daily digest, weekly summary)
- Notification types (which events to receive)
- Quiet hours (no notifications during certain times)
- Channel preference (email only, websocket only, both)

---

## Implementation Priority

### Phase 1 (Critical - Complete Tomorrow)
1. ✅ Initiative approval request email
2. ✅ Initiative overdue email
3. ✅ Extension request/approval/denial emails
4. ✅ Goal approval request email
5. ✅ Goal approved/rejected emails
6. ✅ Review cycle started email
7. ✅ Review assignment email

### Phase 2 (Important - Within Week)
8. Goal achieved/auto-achieved emails
9. Review due soon/overdue emails
10. User status changed emails
11. Supervisor changed emails

### Phase 3 (Nice to Have)
12. Progress update notifications
13. Goal deadline approaching reminders
14. Profile update confirmations
15. Notification preferences system

---

## Testing Checklist

For each notification:
- [ ] Database record created
- [ ] WebSocket message sent (if user online)
- [ ] Email sent via Resend API
- [ ] Email HTML renders correctly on desktop
- [ ] Email HTML renders correctly on mobile
- [ ] Links work correctly
- [ ] Personalization (names) works
- [ ] Priority reflected in UI
- [ ] Notification marked read correctly
- [ ] Old notifications expire/archive correctly
