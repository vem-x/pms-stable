'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import { useAuth } from './auth-context'
import { useQueryClient } from '@tanstack/react-query'

const NotificationContext = createContext(undefined)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const { isConnected, lastMessage } = useWebSocket()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const queryClient = useQueryClient()

  // Map notification types to query keys that should be invalidated
  const getQueryKeysToInvalidate = useCallback((notificationType) => {
    const typeToQueryKeys = {
      // Initiative notifications
      'INITIATIVE_ASSIGNED': ['initiatives'],
      'INITIATIVE_APPROVED': ['initiatives'],
      'INITIATIVE_REJECTED': ['initiatives'],
      'INITIATIVE_STATUS_CHANGED': ['initiatives'],
      'INITIATIVE_SUBMITTED': ['initiatives'],
      'INITIATIVE_REVIEWED': ['initiatives'],
      'INITIATIVE_DEADLINE_APPROACHING': ['initiatives'],

      // Goal notifications
      'GOAL_ASSIGNED': ['goals'],
      'GOAL_APPROVED': ['goals'],
      'GOAL_REJECTED': ['goals'],
      'GOAL_PROGRESS_UPDATED': ['goals'],
      'GOAL_SCORED': ['goals'],
      'GOAL_COMPLETED': ['goals'],
      'GOAL_STATUS_CHANGED': ['goals'],
      'GOAL_DEADLINE_APPROACHING': ['goals'],

      // Task notifications (if you have tasks)
      'TASK_ASSIGNED': ['tasks'],
      'TASK_SUBMITTED': ['tasks'],
      'TASK_REVIEWED': ['tasks'],
      'TASK_STATUS_CHANGED': ['tasks'],
      'TASK_DEADLINE_APPROACHING': ['tasks'],

      // User notifications
      'USER_ROLE_CHANGED': ['users'],
      'USER_STATUS_CHANGED': ['users'],
    }

    return typeToQueryKeys[notificationType] || []
  }, [])

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'new_notification') {
      const newNotification = lastMessage.notification

      // Add to local state
      setNotifications(prev => [newNotification, ...prev])
      setUnreadCount(prev => prev + 1)

      // Show toast notification (optional - you can add toast library later)
      console.log('New notification:', newNotification.title)

      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: ['notifications'] })

      // Invalidate related data queries based on notification type
      const relatedQueryKeys = getQueryKeysToInvalidate(newNotification.type)
      relatedQueryKeys.forEach(queryKey => {
        console.log(`Invalidating cache for: ${queryKey}`)
        queryClient.invalidateQueries({ queryKey: [queryKey] })
      })

      // Also invalidate supervisee goals query for any goal-related notification
      if (newNotification.type?.startsWith('GOAL_')) {
        queryClient.invalidateQueries({ queryKey: ['goals', 'supervisees'] })
      }
    } else if (lastMessage.type === 'marked_read') {
      // Update local state when marked as read
      const notificationId = lastMessage.notification_id
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [lastMessage, queryClient, getQueryKeysToInvalidate])

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev])
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1)
    }
  }, [])

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId)
      if (notification && !notification.is_read) {
        setUnreadCount(count => Math.max(0, count - 1))
      }
      return prev.filter(n => n.id !== notificationId)
    })
  }, [])

  const setInitialNotifications = useCallback((initialNotifications, initialUnreadCount) => {
    setNotifications(initialNotifications)
    setUnreadCount(initialUnreadCount)
  }, [])

  const value = {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    setInitialNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
