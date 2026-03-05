'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinRoom: () => {},
  leaveRoom: () => {},
})

export const useSocket = () => useContext(SocketContext)

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token || !process.env.NEXT_PUBLIC_SOCKET_URL) return

    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
    })

    // Real-time attendance updates
    socketInstance.on('attendance_updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      notifications.show({
        title: 'Attendance Updated',
        message: `Attendance for ${data.class_name} has been updated`,
        color: 'blue',
      })
    })

    // Real-time marks updates
    socketInstance.on('marks_updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['marks'] })
      notifications.show({
        title: 'Marks Updated',
        message: `New marks entered for ${data.subject}`,
        color: 'green',
      })
    })

    // Student enrollment notifications
    socketInstance.on('student_enrolled', (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      notifications.show({
        title: 'New Student Enrolled',
        message: `${data.student_name} has been enrolled`,
        color: 'teal',
      })
    })

    // Fee payment notifications
    socketInstance.on('fee_payment', (data) => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      notifications.show({
        title: 'Fee Payment Received',
        message: `Payment of UGX ${data.amount.toLocaleString()} received`,
        color: 'green',
      })
    })

    // Library book issues
    socketInstance.on('book_issued', (data) => {
      queryClient.invalidateQueries({ queryKey: ['library-issues'] })
      notifications.show({
        title: 'Book Issued',
        message: `"${data.book_title}" issued to ${data.student_name}`,
        color: 'blue',
      })
    })

    // Emergency notifications
    socketInstance.on('emergency_alert', (data) => {
      notifications.show({
        title: 'Emergency Alert',
        message: data.message,
        color: 'red',
        autoClose: false,
      })
    })

    // System announcements
    socketInstance.on('system_announcement', (data) => {
      notifications.show({
        title: 'System Announcement',
        message: data.message,
        color: 'blue',
        autoClose: 10000,
      })
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [queryClient])

  const joinRoom = (room: string) => {
    if (socket) {
      socket.emit('join_room', room)
    }
  }

  const leaveRoom = (room: string) => {
    if (socket) {
      socket.emit('leave_room', room)
    }
  }

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinRoom, leaveRoom }}>
      {children}
    </SocketContext.Provider>
  )
}