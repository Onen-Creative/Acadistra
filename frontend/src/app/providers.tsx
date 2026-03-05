'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider, createTheme, MantineColorScheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { useEffect, useState, startTransition } from 'react'
import { initOfflineDB, syncQueue } from '@/services/offline'
import { marksApi } from '@/services/api'
import { initWebVitals } from '@/utils/webVitals'
import { SocketProvider } from '@/services/socket'
import { AIProvider } from '@/services/ai'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/spotlight/styles.css'
import '@mantine/charts/styles.css'

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  colors: {
    brand: [
      '#e3f2fd',
      '#bbdefb',
      '#90caf9',
      '#64b5f6',
      '#42a5f5',
      '#2196f3',
      '#1e88e5',
      '#1976d2',
      '#1565c0',
      '#0d47a1'
    ]
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    Table: {
      defaultProps: {
        striped: true,
        highlightOnHover: true,
      },
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<MantineColorScheme>('light')
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  }))

  // React 19 - Use startTransition for non-urgent updates
  const initializeApp = () => {
    startTransition(() => {
      // Initialize performance monitoring
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        initWebVitals()
      }
      
      // Initialize offline DB
      if (process.env.NEXT_PUBLIC_ENABLE_OFFLINE === 'true') {
        initOfflineDB()

        // Setup sync callback
        syncQueue.setSyncCallback(async (marks) => {
          await marksApi.batchUpdate(marks)
        })

        // Start auto-sync
        syncQueue.startAutoSync()
      }
    })
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mantine-color-scheme') as MantineColorScheme
      if (stored) setColorScheme(stored)
      initializeApp()
    }
  }, [queryClient])

  const spotlightActions = [
    {
      id: 'students',
      label: 'Search Students',
      description: 'Find students by name or admission number',
      onClick: () => window.location.href = '/students',
      leftSection: '👨🎓',
    },
    {
      id: 'staff',
      label: 'Search Staff',
      description: 'Find teachers and staff members',
      onClick: () => window.location.href = '/staff',
      leftSection: '👨🏫',
    },
    {
      id: 'attendance',
      label: 'Take Attendance',
      description: 'Mark student attendance',
      onClick: () => window.location.href = '/attendance',
      leftSection: '📋',
    },
    {
      id: 'library',
      label: 'Library Management',
      description: 'Manage books and issues',
      onClick: () => window.location.href = '/library',
      leftSection: '📚',
    },
  ]

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
      <Notifications position="top-right" />
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          <SocketProvider>
            <AIProvider>
              {children}
            </AIProvider>
          </SocketProvider>
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  )
}