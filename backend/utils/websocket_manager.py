"""
WebSocket Connection Manager
Manages active WebSocket connections for real-time notifications
"""

from typing import Dict, Set
from fastapi import WebSocket
from uuid import UUID
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""

    def __init__(self):
        # Store active connections: {user_id: set of WebSocket connections}
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: UUID):
        """Accept and store a new WebSocket connection"""
        await websocket.accept()

        user_id_str = str(user_id)
        if user_id_str not in self.active_connections:
            self.active_connections[user_id_str] = set()

        self.active_connections[user_id_str].add(websocket)
        logger.info(f"WebSocket connected for user {user_id_str}. Total connections: {len(self.active_connections[user_id_str])}")

    def disconnect(self, websocket: WebSocket, user_id: UUID):
        """Remove a WebSocket connection"""
        user_id_str = str(user_id)
        if user_id_str in self.active_connections:
            self.active_connections[user_id_str].discard(websocket)

            # Clean up empty sets
            if not self.active_connections[user_id_str]:
                del self.active_connections[user_id_str]

            logger.info(f"WebSocket disconnected for user {user_id_str}")

    async def send_personal_notification(self, user_id: UUID, notification_data: dict):
        """Send notification to a specific user via all their active connections"""
        user_id_str = str(user_id)

        if user_id_str not in self.active_connections:
            logger.debug(f"No active connections for user {user_id_str}")
            return

        message = json.dumps(notification_data)
        dead_connections = set()

        for connection in self.active_connections[user_id_str]:
            try:
                await connection.send_text(message)
                logger.debug(f"Notification sent to user {user_id_str}")
            except Exception as e:
                logger.error(f"Error sending notification to user {user_id_str}: {e}")
                dead_connections.add(connection)

        # Clean up dead connections
        for connection in dead_connections:
            self.active_connections[user_id_str].discard(connection)

    async def broadcast_to_users(self, user_ids: list[UUID], notification_data: dict):
        """Broadcast notification to multiple users"""
        for user_id in user_ids:
            await self.send_personal_notification(user_id, notification_data)

    async def send_system_broadcast(self, notification_data: dict):
        """Send notification to all connected users"""
        message = json.dumps(notification_data)
        dead_connections = []

        for user_id_str, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id_str}: {e}")
                    dead_connections.append((user_id_str, connection))

        # Clean up dead connections
        for user_id_str, connection in dead_connections:
            if user_id_str in self.active_connections:
                self.active_connections[user_id_str].discard(connection)

    def get_active_users_count(self) -> int:
        """Get count of users with active connections"""
        return len(self.active_connections)

    def get_total_connections_count(self) -> int:
        """Get total number of active WebSocket connections"""
        return sum(len(connections) for connections in self.active_connections.values())

    def is_user_online(self, user_id: UUID) -> bool:
        """Check if a user has any active connections"""
        return str(user_id) in self.active_connections


# Global connection manager instance
manager = ConnectionManager()
