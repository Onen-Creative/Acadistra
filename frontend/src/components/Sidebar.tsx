'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '@/services/api'
import toast from 'react-hot-toast'
import { useMantineColorScheme } from '@mantine/core'
import { Moon, Sun } from 'lucide-react'

interface SidebarProps {
  userRole: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      toast.success('Logged out successfully')
      router.push('/login')
    }
  }

  const getMenuItems = () => {
    const commonItems = [
      { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    ]

    switch (userRole) {
      case 'system_admin':
        return [
          ...commonItems,
          { href: '/schools', label: 'Schools', icon: '🏫' },
          { href: '/admins', label: 'Admins', icon: '👥' },
        ]
      case 'school_admin':
        return [
          ...commonItems,
          { href: '/students', label: 'Students', icon: '👨🎓' },
          { href: '/staff', label: 'Staff', icon: '👥' },
          { href: '/classes', label: 'Classes', icon: '📚' },
          { href: '/attendance/history', label: 'Attendance History', icon: '📊' },
          { href: '/reports', label: 'Reports', icon: '📊' },
          { href: '/payroll', label: 'Payroll', icon: '💰' },
          { href: '/finance/budget', label: 'Budget', icon: '💵' },
          { href: '/finance/requisitions', label: 'Requisitions', icon: '📝' },
          { href: '/settings', label: 'Settings', icon: '⚙️' },
        ]
      case 'teacher':
        return [
          ...commonItems,
          { href: '/marks/enter', label: 'Enter Marks', icon: '✏️' },
          { href: '/view-marks', label: 'View Marks', icon: '👀' },
          { href: '/attendance', label: 'Attendance', icon: '📋' },
          { href: '/attendance/history', label: 'Attendance History', icon: '📊' },
          { href: '/finance/requisitions', label: 'Requisitions', icon: '📝' },
        ]
      case 'bursar':
        return [
          ...commonItems,
          { href: '/fees', label: 'Fees', icon: '💳' },
          { href: '/finance', label: 'Finance', icon: '💰' },
          { href: '/finance/budget', label: 'Budget', icon: '💵' },
          { href: '/finance/requisitions', label: 'Requisitions', icon: '📝' },
          { href: '/fees/reports', label: 'Reports', icon: '📊' },
        ]
      case 'librarian':
        return [
          ...commonItems,
          { href: '/library', label: 'Library', icon: '📚' },
          { href: '/library/books', label: 'Books', icon: '📖' },
          { href: '/library/issues', label: 'Issues', icon: '📋' },
          { href: '/finance/requisitions', label: 'Requisitions', icon: '📝' },
        ]
      case 'nurse':
        return [
          ...commonItems,
          { href: '/clinic', label: 'Clinic', icon: '🏥' },
          { href: '/clinic/visits', label: 'Visits', icon: '👩⚕️' },
          { href: '/clinic/medicines', label: 'Medicines', icon: '💊' },
          { href: '/finance/requisitions', label: 'Requisitions', icon: '📝' },
        ]
      default:
        return commonItems
    }
  }

  const menuItems = getMenuItems()

  return (
    <div className={`bg-gray-800 text-white h-screen transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h1 className={`font-bold text-xl ${isCollapsed ? 'hidden' : 'block'}`}>
            Acadistra
          </h1>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-gray-700"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      <nav className="mt-8">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <span className="text-xl">{item.icon}</span>
            <span className={`ml-3 ${isCollapsed ? 'hidden' : 'block'}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <button
          onClick={() => toggleColorScheme()}
          className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded"
        >
          {colorScheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className={`ml-3 ${isCollapsed ? 'hidden' : 'block'}`}>
            {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
        <Link
          href="/profile"
          className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded"
        >
          <span className="text-xl">👤</span>
          <span className={`ml-3 ${isCollapsed ? 'hidden' : 'block'}`}>
            Profile
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-red-600 hover:text-white transition-colors rounded"
        >
          <span className="text-xl">🚪</span>
          <span className={`ml-3 ${isCollapsed ? 'hidden' : 'block'}`}>
            Logout
          </span>
        </button>
      </div>
    </div>
  )
}
