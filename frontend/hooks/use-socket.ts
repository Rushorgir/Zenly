/**
 * useSocket Hook
 * 
 * Custom hook for managing Socket.IO connections with:
 * - Automatic reconnection handling
 * - Connection state management
 * - Event listener cleanup
 * - Error handling and retries
 * 
 * @hook
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  url?: string
  autoConnect?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

interface SocketState {
  connected: boolean
  error: Error | null
  reconnecting: boolean
}

/**
 * Custom hook for Socket.IO management
 * @param options - Socket.IO configuration options
 * @returns Socket instance and connection state
 */
export function useSocket(options: UseSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000
  } = options

  const [state, setState] = useState<SocketState>({
    connected: false,
    error: null,
    reconnecting: false
  })

  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!autoConnect) return

    // Initialize socket
    socketRef.current = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts,
      reconnectionDelay,
      autoConnect: true
    })

    const socket = socketRef.current

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to server')
      setState({
        connected: true,
        error: null,
        reconnecting: false
      })
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason)
      setState(prev => ({
        ...prev,
        connected: false,
        reconnecting: reason === 'io server disconnect' ? false : true
      }))
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error)
      setState(prev => ({
        ...prev,
        error,
        reconnecting: true
      }))
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket.IO] Reconnected after ${attemptNumber} attempts`)
      setState({
        connected: true,
        error: null,
        reconnecting: false
      })
    })

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket.IO] Reconnection attempt ${attemptNumber}`)
    })

    socket.on('reconnect_failed', () => {
      console.error('[Socket.IO] Reconnection failed after all attempts')
      setState(prev => ({
        ...prev,
        error: new Error('Failed to reconnect to server'),
        reconnecting: false
      }))
    })

    // Cleanup on unmount
    return () => {
      console.log('[Socket.IO] Cleaning up connection')
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [url, autoConnect, reconnectionAttempts, reconnectionDelay])

  /**
   * Subscribe to a socket event
   */
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }, [])

  /**
   * Unsubscribe from a socket event
   */
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback)
      } else {
        socketRef.current.off(event)
      }
    }
  }, [])

  /**
   * Emit a socket event
   */
  const emit = useCallback((event: string, ...args: any[]) => {
    if (socketRef.current && state.connected) {
      socketRef.current.emit(event, ...args)
    } else {
      console.warn(`[Socket.IO] Cannot emit '${event}': Not connected`)
    }
  }, [state.connected])

  /**
   * Manually connect the socket
   */
  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect()
    }
  }, [])

  /**
   * Manually disconnect the socket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
  }, [])

  return {
    socket: socketRef.current,
    connected: state.connected,
    error: state.error,
    reconnecting: state.reconnecting,
    on,
    off,
    emit,
    connect,
    disconnect
  }
}

export default useSocket
