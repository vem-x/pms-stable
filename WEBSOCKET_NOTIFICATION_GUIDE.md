# WebSocket Real-Time Notifications Guide

## Overview
The NIGCOMSAT PMS now has real-time notifications using WebSocket connections. Users receive instant notifications when important events occur (goals assigned, initiatives submitted, etc.).

## Backend Implementation

### Components

1. **WebSocket Connection Manager** (`backend/utils/websocket_manager.py`)
   - Manages active WebSocket connections
   - Routes notifications to specific users
   - Handles connection lifecycle (connect, disconnect, cleanup)

2. **Notification API Router** (`backend/routers/notifications.py`)
   - WebSocket endpoint: `ws://host/api/notifications/ws?token=<jwt_token>`
   - REST endpoints for notification CRUD
   - Integrates with WebSocket manager

3. **Notification Service** (`backend/utils/notifications.py`)
   - Creates notifications in database
   - Automatically sends via WebSocket to online users
   - Handles all notification types (goals, initiatives, reviews, etc.)

### WebSocket Protocol

#### Connection

**Connect URL:**
```
ws://160.226.0.67:8000/api/notifications/ws?token=YOUR_JWT_TOKEN
```

**Connection Success Response:**
```json
{
  "type": "connection_established",
  "message": "Connected to notification service",
  "user_id": "uuid-here"
}
```

#### Receiving Notifications

When a notification is created, online users receive:

```json
{
  "type": "new_notification",
  "notification": {
    "id": "notification-uuid",
    "type": "goal_assigned",
    "priority": "high",
    "title": "New Goal Assigned to You",
    "message": "John Doe has assigned you a new goal: 'Complete Q1 Training'. Please review and accept or decline.",
    "action_url": "/goals/goal-uuid/respond",
    "data": {
      "goal_id": "goal-uuid"
    },
    "triggered_by_name": "John Doe",
    "created_at": "2025-11-17T10:30:00Z",
    "is_read": false
  }
}
```

#### Client Messages

**Keep-Alive Ping:**
```
Send: "ping"
Receive: "pong"
```

**Mark Notification as Read:**
```
Send: "mark_read:notification-uuid"
Receive: {
  "type": "marked_read",
  "notification_id": "notification-uuid"
}
```

## REST API Endpoints

### Get Notifications
```
GET /api/notifications
Query Parameters:
  - skip: int (default: 0)
  - limit: int (default: 20)
  - unread_only: bool (default: false)
  - notification_type: NotificationType (optional)
  - priority: NotificationPriority (optional)

Response:
{
  "notifications": [...],
  "total": 45,
  "unread_count": 12,
  "page": 1,
  "per_page": 20
}
```

### Get Notification Stats
```
GET /api/notifications/stats

Response:
{
  "total_count": 45,
  "unread_count": 12,
  "by_type": {
    "goal_assigned": 5,
    "initiative_submitted": 7,
    ...
  },
  "by_priority": {
    "high": 3,
    "medium": 8,
    "low": 34
  }
}
```

### Mark as Read
```
PUT /api/notifications/{notification_id}/read

Response: NotificationResponse
```

### Mark All as Read
```
PUT /api/notifications/mark-all-read

Response:
{
  "message": "12 notifications marked as read"
}
```

### Delete Notification
```
DELETE /api/notifications/{notification_id}

Response:
{
  "message": "Notification deleted successfully"
}
```

### WebSocket Connection Stats
```
GET /api/notifications/connection-stats

Response:
{
  "active_users": 15,
  "total_connections": 18,
  "user_online": true
}
```

## Frontend Implementation Guide

### 1. WebSocket Connection Setup

```javascript
// Create WebSocket connection
const token = getAuthToken(); // Get JWT from cookies/storage
const ws = new WebSocket(`ws://160.226.0.67:8000/api/notifications/ws?token=${token}`);

ws.onopen = () => {
  console.log('Connected to notification service');

  // Start keep-alive ping every 30 seconds
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('ping');
    }
  }, 30000);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'connection_established':
      console.log('Connection established:', data.user_id);
      break;

    case 'new_notification':
      handleNewNotification(data.notification);
      break;

    case 'marked_read':
      updateNotificationUI(data.notification_id);
      break;

    default:
      console.log('Unknown message type:', data);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from notification service');
  // Implement reconnection logic here
  setTimeout(connectWebSocket, 5000);
};
```

### 2. Handle New Notifications

```javascript
function handleNewNotification(notification) {
  // Update notification badge count
  updateNotificationBadge();

  // Show toast notification
  showToast({
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    onClick: () => {
      if (notification.action_url) {
        router.push(notification.action_url);
      }
    }
  });

  // Add to notification list
  addToNotificationList(notification);

  // Play sound for high priority
  if (notification.priority === 'high' || notification.priority === 'urgent') {
    playNotificationSound();
  }
}
```

### 3. Mark Notification as Read

```javascript
// Via WebSocket
function markAsReadViaWS(notificationId) {
  ws.send(`mark_read:${notificationId}`);
}

// Via REST API
async function markAsReadViaAPI(notificationId) {
  await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}
```

### 4. Notification UI Components

**Notification Bell Component:**
```jsx
function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Fetch initial notifications
    fetchNotifications();

    // Connect to WebSocket
    const ws = connectWebSocket();

    return () => ws.close();
  }, []);

  const fetchNotifications = async () => {
    const response = await fetch('/api/notifications?limit=10&unread_only=true');
    const data = await response.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unread_count);
  };

  return (
    <div className="notification-bell">
      <button onClick={() => setIsOpen(!isOpen)}>
        <BellIcon />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      )}
    </div>
  );
}
```

## Goal Workflow Integration

### Personal Goal Creation
```javascript
// User creates personal goal
const response = await fetch('/api/goals', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Complete Advanced Training',
    type: 'INDIVIDUAL',
    quarter: 'Q1',
    year: 2025,
    ...
  })
});

// Supervisor receives real-time notification:
// "John Doe has created a new goal 'Complete Advanced Training' that requires your approval."
```

### Supervisor Assigns Goal
```javascript
// Supervisor assigns goal to supervisee
const response = await fetch('/api/goals/assign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assigned_to_user_id: 'supervisee-uuid',
    title: 'Improve Customer Satisfaction',
    type: 'INDIVIDUAL',
    quarter: 'Q1',
    year: 2025,
    ...
  })
});

// Supervisee receives real-time notification:
// "Jane Smith has assigned you a new goal: 'Improve Customer Satisfaction'. Please review and accept or decline."
```

### Goal Approval/Rejection
```javascript
// Supervisor approves goal
await fetch(`/api/goals/${goalId}/approve`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Goal owner receives notification:
// "Jane Smith has approved your goal 'Complete Advanced Training'."
```

## Notification Types

### Goal Notifications
- `goal_created` - Personal goal awaiting supervisor approval
- `goal_assigned` - Supervisor assigned goal to you
- `goal_approved` - Your goal was approved
- `goal_rejected` - Your goal was rejected
- `goal_accepted` - Supervisee accepted your assigned goal
- `goal_declined` - Supervisee declined your assigned goal

### Initiative Notifications
- `initiative_created` - New initiative awaiting approval
- `initiative_assigned` - Initiative assigned to you
- `initiative_submitted` - Initiative submitted for review
- `initiative_reviewed` - Your initiative was reviewed
- `initiative_overdue` - Initiative is overdue
- `initiative_extension_requested` - Extension requested
- `initiative_extension_approved` - Extension approved
- `initiative_extension_denied` - Extension denied

### Review Notifications
- `review_assigned` - Review assigned to you
- `review_due_soon` - Review deadline approaching
- `review_overdue` - Review is overdue
- `review_submitted` - Review was submitted

### User Notifications
- `user_created` - Welcome notification with onboarding
- `user_status_changed` - Account status changed
- `user_role_changed` - Role changed

### System Notifications
- `system_announcement` - System-wide announcements

## Testing the Implementation

### 1. Test WebSocket Connection
```bash
# Install wscat for testing
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://160.226.0.67:8000/api/notifications/ws?token=YOUR_TOKEN"

# Should receive connection_established message
```

### 2. Test Notification Flow
1. Create a personal goal as User A
2. User B (supervisor) should receive real-time notification
3. User B approves/rejects goal
4. User A receives real-time notification

### 3. Test Multiple Connections
1. Open app in multiple tabs
2. All tabs should receive same notifications
3. Mark as read in one tab updates all tabs

## Deployment Notes

### Backend Requirements
```
# Add to requirements.txt if not present
fastapi[all]
websockets
```

### Environment Variables
```
# .env file
CORS_ALLOWED_ORIGINS=http://160.226.0.67:3000,http://160.226.0.67:3002
```

### Nginx Configuration (if using)
```nginx
location /api/notifications/ws {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Troubleshooting

### WebSocket won't connect
- Check CORS settings include your frontend URL
- Verify JWT token is valid
- Check firewall allows WebSocket connections

### Notifications not appearing
- Verify WebSocket connection is established
- Check notification service is creating notifications in database
- Verify user has active WebSocket connection

### High server load
- Implement connection pooling
- Add rate limiting on notifications
- Clean up old notifications regularly
