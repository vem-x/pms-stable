# Calendar Features - Implementation TODO

## Overview
The calendar page currently exists at `/dashboard/calendar` and displays **tasks** only. This document outlines the features needed to make it a comprehensive calendar system for meetings, reminders, initiatives, and subtasks.

## Current State
- ✅ Calendar page exists with FullCalendar integration
- ✅ Displays tasks with due dates
- ✅ Click to view task details
- ✅ Month, week, day, and list views
- ✅ Color-coded by task status and urgency

## Features to Implement

### 1. Backend Requirements

#### Database Models Needed
1. **Meetings Table**
   ```sql
   - id: UUID
   - title: VARCHAR(255)
   - description: TEXT
   - start_time: TIMESTAMP
   - end_time: TIMESTAMP
   - location: VARCHAR(255)
   - meeting_link: VARCHAR(500) (for virtual meetings)
   - created_by: UUID (FK to users)
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP
   ```

2. **Meeting Participants Table**
   ```sql
   - id: UUID
   - meeting_id: UUID (FK to meetings)
   - user_id: UUID (FK to users)
   - status: ENUM (invited, accepted, declined, tentative)
   - created_at: TIMESTAMP
   ```

3. **Reminders Table**
   ```sql
   - id: UUID
   - title: VARCHAR(255)
   - description: TEXT
   - reminder_datetime: TIMESTAMP
   - user_id: UUID (FK to users)
   - completed: BOOLEAN (default FALSE)
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP
   ```

#### API Endpoints Needed

**Meetings:**
- `POST /api/meetings` - Create a meeting
- `GET /api/meetings` - List all meetings for current user
- `GET /api/meetings/{id}` - Get meeting details
- `PUT /api/meetings/{id}` - Update meeting
- `DELETE /api/meetings/{id}` - Delete meeting
- `POST /api/meetings/{id}/participants` - Add participants
- `PUT /api/meetings/{id}/participants/{user_id}/status` - Update participant status (accept/decline)

**Reminders:**
- `POST /api/reminders` - Create a reminder
- `GET /api/reminders` - List all reminders for current user
- `GET /api/reminders/{id}` - Get reminder details
- `PUT /api/reminders/{id}` - Update reminder
- `DELETE /api/reminders/{id}` - Delete reminder
- `PUT /api/reminders/{id}/complete` - Mark reminder as completed

**Initiatives (Enhancement):**
- ✅ Already exists: `GET /api/initiatives` - Returns initiatives with due dates
- Add calendar visibility flag if needed

**Subtasks (Enhancement):**
- ✅ Already exists: Initiative subtasks are returned with initiatives
- Ensure subtasks have dates/deadlines for calendar display

### 2. Frontend Requirements

#### Calendar Page Enhancements
1. **Display Multiple Event Types**
   - Tasks (already implemented)
   - Initiatives (with subtasks)
   - Meetings
   - Reminders

2. **Event Color Coding**
   - Tasks: Current colors (by status/urgency)
   - Initiatives: Blue/Purple gradient
   - Meetings: Green
   - Reminders: Yellow/Orange

3. **Creation Dialogs**
   - "Create Initiative" button/dialog
   - "Create Meeting" button/dialog
   - "Create Reminder" button/dialog
   - Quick create on date click (modal with type selector)

4. **Detail Views**
   - Task detail modal (already exists)
   - Initiative detail modal (show initiative + all subtasks)
   - Meeting detail modal (show participants, join link, accept/decline)
   - Reminder detail modal (mark as completed)

5. **Filters**
   - Filter by event type (tasks, initiatives, meetings, reminders)
   - Filter by status
   - Filter by participants (meetings)

### 3. Implementation Priority

**Phase 1 - Initiatives on Calendar**
1. Update calendar page to fetch and display initiatives
2. Add initiative detail modal
3. Show initiative subtasks in detail view
4. Add "Create Initiative" button that opens initiative form

**Phase 2 - Meetings**
1. Create meetings database model and API
2. Add meetings to calendar display
3. Create meeting creation/edit dialog
4. Add participant management
5. Add meeting detail modal with join link

**Phase 3 - Reminders**
1. Create reminders database model and API
2. Add reminders to calendar display
3. Create reminder creation/edit dialog
4. Add quick reminder creation
5. Add reminder notifications

**Phase 4 - Polish**
1. Add comprehensive filters
2. Add recurring events support
3. Add calendar export (iCal)
4. Add calendar sync with external calendars
5. Add drag-and-drop to reschedule

### 4. Technical Notes

#### Calendar Event Structure
```javascript
{
  id: string,
  title: string,
  start: Date,
  end: Date,
  type: 'task' | 'initiative' | 'meeting' | 'reminder',
  backgroundColor: string,
  borderColor: string,
  textColor: string,
  extendedProps: {
    status: string,
    urgency?: string,
    participants?: Array,
    completed?: boolean,
    // ... other type-specific data
  }
}
```

#### API Response Format
All calendar-related APIs should return data that can be easily transformed into the calendar event structure.

### 5. WebSocket Integration
- Real-time meeting invitations
- Real-time meeting updates
- Real-time reminder notifications
- Real-time initiative deadline changes

### 6. Permissions
- Users can create reminders for themselves
- Users can create meetings and invite others within their scope
- Users can create initiatives within their scope
- Meeting participants can accept/decline invitations

## Next Steps
1. Decide on implementation priority (which phase to start with)
2. Create database migrations for new tables
3. Implement backend API endpoints
4. Update frontend calendar page
5. Test and iterate

## Notes
- Hold calendar implementation until user confirms priority
- WebSocket URL issue has been fixed (removed double /ws prefix)
- Consider using existing initiative creation modal on calendar page
