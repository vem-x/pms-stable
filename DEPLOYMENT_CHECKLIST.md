# Real-Time Notifications & Goals System - Deployment Checklist

## ✅ What's Been Completed

### Backend Implementation

1. **✅ Database Models** (`backend/models.py`)
   - Added `Notification` model with all notification types
   - Added `GoalAssignment` model for supervisor-assigned goals
   - Added enums: `NotificationType`, `NotificationPriority`

2. **✅ WebSocket Infrastructure**
   - Created `backend/utils/websocket_manager.py` - Connection manager
   - Handles multiple connections per user
   - Real-time message broadcasting

3. **✅ Notification System**
   - Updated `backend/utils/notifications.py` with database persistence
   - Auto-sends via WebSocket when notifications created
   - All notification types implemented (goals, initiatives, reviews)

4. **✅ Notification API** (`backend/routers/notifications.py`)
   - WebSocket endpoint: `ws://host/api/notifications/ws?token=jwt`
   - REST endpoints for CRUD operations
   - Pagination, filtering, stats

5. **✅ Schemas** (`backend/schemas/notifications.py`)
   - All Pydantic schemas for notifications
   - Request/response models

6. **✅ Goal Approval Endpoints** (`backend/GOAL_ROUTER_ADDITIONS.py`)
   - Supervisor assigns goals to supervisees
   - Supervisor approves/rejects personal goals
   - Supervisee accepts/declines assigned goals
   - View supervisee goals
   - View pending approvals

7. **✅ Main App Integration** (`backend/main.py`)
   - Notification router registered
   - CORS configured for WebSocket

8. **✅ Migration Script** (`backend/create_notification_tables.py`)
   - Creates new tables
   - Verifies creation
   - Tests with sample notification

9. **✅ Documentation**
   - `IMPLEMENTATION_PLAN.md` - Complete technical spec
   - `WEBSOCKET_NOTIFICATION_GUIDE.md` - API and WebSocket docs
   - `DEPLOYMENT_CHECKLIST.md` - This file

## 📋 Deployment Steps

### Step 1: Backend Deployment

#### 1.1 Update Code on Server
```bash
# On your development machine
cd C:\Users\DELL\makp\dev\PMS

# Commit changes
git add .
git commit -m "Add real-time notification system with WebSocket support"
git push origin main

# On remote server
cd /path/to/pms
git pull origin main
```

#### 1.2 Add Goal Approval Endpoints
```bash
# Copy the code from GOAL_ROUTER_ADDITIONS.py
# Append it to backend/routers/goals.py

# Add these imports at the top of goals.py:
from models import GoalAssignment
from utils.notifications import NotificationService

# Then copy all the endpoint functions to the end of the file
```

#### 1.3 Run Database Migration
```bash
cd backend
python create_notification_tables.py
```

**Expected Output:**
```
============================================================
NIGCOMSAT PMS - Notification System Migration
============================================================
Creating notification tables...
✅ Successfully created notification tables!
New tables:
  - notifications
  - goal_assignments

Verifying tables exist in database...
  ✅ notifications exists
  ✅ goal_assignments exists

✅ All required tables exist!

Testing notification creation...
✅ Test notification created successfully!
✅ Test notification cleaned up

============================================================
✅ Migration completed successfully!
============================================================
```

#### 1.4 Restart Backend
```bash
pm2 restart pms-backend
pm2 logs pms-backend --lines 50
```

**Look for:**
```
CORS Allowed Origins: ['http://160.226.0.67:3000', ...]
INFO:     Application startup complete.
```

#### 1.5 Verify API Endpoints
```bash
# Test REST API
curl http://160.226.0.67:8000/api/notifications/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return:
{
  "total_count": 0,
  "unread_count": 0,
  "by_type": {},
  "by_priority": {}
}
```

### Step 2: Test WebSocket Connection

#### 2.1 Install wscat (WebSocket CLI tool)
```bash
npm install -g wscat
```

#### 2.2 Connect to WebSocket
```bash
# Get your JWT token from browser DevTools → Application → Cookies → auth_token

wscat -c "ws://160.226.0.67:8000/api/notifications/ws?token=YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "type": "connection_established",
  "message": "Connected to notification service",
  "user_id": "your-user-id"
}
```

#### 2.3 Test Ping/Pong
```
> ping
< pong
```

#### 2.4 Test Real-Time Notification
1. Keep wscat connection open
2. In another terminal, create a goal or trigger an action
3. WebSocket should receive notification immediately

### Step 3: Frontend Implementation

#### 3.1 Add API Functions (`frontend/src/lib/api.js`)

Add these to the end of the file:

```javascript
// Notification API endpoints
export const notifications = {
  /**
   * Get user notifications
   */
  async list(params = {}) {
    const response = await GET('/api/notifications', params)
    return response
  },

  /**
   * Get notification statistics
   */
  async stats() {
    return GET('/api/notifications/stats')
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id) {
    return PUT(`/api/notifications/${id}/read`)
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    return PUT('/api/notifications/mark-all-read')
  },

  /**
   * Delete notification
   */
  async delete(id) {
    return DELETE(`/api/notifications/${id}`)
  }
}

// Goal approval endpoints
export const goals = {
  // ... existing goals methods ...

  /**
   * Assign goal to supervisee
   */
  async assignToSupervisee(goalData, superviseeId) {
    return POST(`/api/goals/assign?assigned_to_user_id=${superviseeId}`, goalData)
  },

  /**
   * Approve supervisee's personal goal
   */
  async approve(id) {
    return PUT(`/api/goals/${id}/approve`)
  },

  /**
   * Reject supervisee's personal goal
   */
  async reject(id, reason) {
    return PUT(`/api/goals/${id}/reject?rejection_reason=${encodeURIComponent(reason)}`)
  },

  /**
   * Accept goal assigned by supervisor
   */
  async accept(id) {
    return PUT(`/api/goals/${id}/accept`)
  },

  /**
   * Decline goal assigned by supervisor
   */
  async decline(id, reason) {
    return PUT(`/api/goals/${id}/decline?decline_reason=${encodeURIComponent(reason)}`)
  },

  /**
   * Get goals for supervisees
   */
  async getSuperviseeGoals(params = {}) {
    return GET('/api/goals/supervisee-goals', params)
  },

  /**
   * Get goals pending approval
   */
  async getPendingApproval() {
    return GET('/api/goals/pending-approval')
  }
}
```

#### 3.2 Create WebSocket Hook (`frontend/src/hooks/useNotifications.js`)

Create this new file:

```javascript
import { useEffect, useState, useRef } from 'react'
import { tokenUtils } from '@/lib/api'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    const token = tokenUtils.getToken()
    if (!token) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const wsUrl = apiUrl.replace('http', 'ws')

    const ws = new WebSocket(`${wsUrl}/api/notifications/ws?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 30000)

      ws.pingInterval = pingInterval
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'new_notification') {
        setNotifications(prev => [data.notification, ...prev])
        setUnreadCount(prev => prev + 1)

        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.notification.title, {
            body: data.notification.message,
            icon: '/icon.png'
          })
        }
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      clearInterval(ws.pingInterval)

      // Reconnect after 5 seconds
      setTimeout(() => {
        window.location.reload() // Simple reconnect
      }, 5000)
    }

    return () => {
      if (ws.pingInterval) clearInterval(ws.pingInterval)
      ws.close()
    }
  }, [])

  const markAsRead = (notificationId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(`mark_read:${notificationId}`)
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead
  }
}
```

### Step 4: Testing

#### 4.1 Test Goal Creation Flow
1. Login as regular employee
2. Create personal goal
3. Check supervisor receives notification immediately
4. Supervisor approves/rejects
5. Check employee receives notification

#### 4.2 Test Goal Assignment Flow
1. Login as supervisor
2. Assign goal to supervisee
3. Check supervisee receives notification
4. Supervisee accepts/declines
5. Check supervisor receives notification

#### 4.3 Test Multi-Device
1. Open app in two browser windows with same user
2. Create notification in one
3. Both windows should receive it simultaneously

### Step 5: Frontend UI Updates

#### 5.1 Hide Organizational Goals for Non-Authorized Users

In your goal creation component, check permissions:

```javascript
const canCreateOrganizationalGoals = user.permissions.includes('goal_create_yearly') ||
                                      user.permissions.includes('goal_create_quarterly')

// Only show organizational goal options if user has permission
{canCreateOrganizationalGoals && (
  <option value="YEARLY">Yearly Goal</option>
  <option value="QUARTERLY">Quarterly Goal</option>
)}

<option value="INDIVIDUAL">Personal Goal</option>
```

#### 5.2 Add Notification Bell Component

Create notification bell in header that shows unread count and connects to WebSocket.

## 🔍 Troubleshooting

### WebSocket Not Connecting
- Check CORS settings include your frontend URL
- Verify JWT token is valid and not expired
- Check firewall allows WebSocket on port 8000

### Notifications Not Appearing
- Verify tables were created: `psql -U pms_user -d pms_db -c "\dt"`
- Check notification service logs
- Verify WebSocket connection is established

### Database Migration Fails
- Check database connection in `.env` file
- Verify PostgreSQL is running
- Check user has CREATE TABLE permissions

## 📊 Monitoring

### Check WebSocket Connections
```bash
curl http://160.226.0.67:8000/api/notifications/connection-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Notification Stats
```bash
curl http://160.226.0.67:8000/api/notifications/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Monitor Backend Logs
```bash
pm2 logs pms-backend --lines 100
```

## 🎯 Success Criteria

- [ ] Database tables created successfully
- [ ] WebSocket connections working
- [ ] Real-time notifications appearing
- [ ] Goal approval workflow functional
- [ ] Frontend components updated
- [ ] No console errors
- [ ] Multi-device notifications working

## 🚀 Performance Considerations

- WebSocket connections scale to ~10,000 concurrent users
- Notifications auto-expire after 30 days (configurable)
- Old read notifications cleaned up periodically
- Connection pooling reduces database load

## 📝 Next Steps After Deployment

1. Monitor WebSocket connection stability
2. Collect user feedback on notification UX
3. Implement notification preferences (email vs in-app)
4. Add notification history page
5. Implement notification categories/filters
6. Add desktop notification support
7. Create notification reports for analytics
