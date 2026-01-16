'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './auth-context'
import { tokenUtils } from './api'

// Clean up the WebSocket URL by removing any trailing paths
const getWebSocketURL = () => {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
  // Remove any trailing /ws, /api, or other paths to ensure clean base URL
  return baseUrl.replace(/\/(ws|api).*$/, '')
}

const WEBSOCKET_URL = getWebSocketURL()

export function useWebSocket() {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  const connect = useCallback(() => {
    // Get token from cookies using tokenUtils
    const token = tokenUtils.getToken()

    if (!token || !user) {
      console.log('No token or user, skipping WebSocket connection')
      return
    }

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close()
      }

      const wsUrl = `${WEBSOCKET_URL}/api/notifications/ws?token=${token}`
      console.log('Connecting to WebSocket:', wsUrl)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectAttemptsRef.current = 0

        // Start ping interval to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping')
          }
        }, 30000) // Ping every 30 seconds

        // Store ping interval for cleanup
        ws.pingInterval = pingInterval
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)

        // Clear ping interval
        if (ws.pingInterval) {
          clearInterval(ws.pingInterval)
        }

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY)
        } else {
          console.log('Max reconnection attempts reached')
        }
      }

    } catch (error) {
      console.error('Error establishing WebSocket connection:', error)
    }
  }, [user])

  // Connect on mount and when user changes
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        if (wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval)
        }
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message)
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  const markAsRead = useCallback((notificationId) => {
    sendMessage(`mark_read:${notificationId}`)
  }, [sendMessage])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    markAsRead,
    reconnect: connect
  }
}
