'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useMantineColorScheme } from '@mantine/core'
import { 
  LayoutDashboard, School, UserPlus, Users, Settings, FileText, BarChart3,
  GraduationCap, BookOpen, ClipboardList, DollarSign, Package,
  Calendar, Edit3, Eye, Library, Stethoscope, Pill, Menu as MenuIcon,
  LogOut, User, Moon, Sun
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        await fetch('http://localhost:8080/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.clear()
      router.push('/login')
    }
  }

  const getMenuItems = () => {
    switch (user?.role) {
      case 'system_admin':
        return [
          { href: '/dashboard/system-admin', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/system/schools', label: 'Schools', icon: School },
          { href: '/system/schools/create', label: 'Create School', icon: UserPlus },
          { href: '/system/users', label: 'Users', icon: Users },
          { href: '/system/settings', label: 'Settings', icon: Settings },
          { href: '/system/audit-logs', label: 'Audit Logs', icon: FileText },
          { href: '/system/reports', label: 'Reports', icon: BarChart3 },
        ]
      case 'school_admin':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/students', label: 'Students', icon: GraduationCap },
          { href: '/staff', label: 'Staff', icon: Users },
          { href: '/classes', label: 'Classes', icon: BookOpen },
          { href: '/users', label: 'Users', icon: Users },
          { href: '/results', label: 'Results', icon: ClipboardList },
          { href: '/report-cards', label: 'Report Cards', icon: FileText },
          { href: '/attendance', label: 'Attendance', icon: Calendar },
          { href: '/lessons', label: 'Lesson Monitoring', icon: BookOpen },
          { href: '/inventory', label: 'Inventory', icon: Package },
          { href: '/reports', label: 'Reports', icon: BarChart3 },
          { href: '/payroll', label: 'Payroll', icon: DollarSign },
          { href: '/finance', label: 'Finance', icon: DollarSign },
          { href: '/finance/budget', label: 'Budget', icon: DollarSign },
          { href: '/finance/requisitions', label: 'Requisitions', icon: ClipboardList },
          { href: '/settings', label: 'Settings', icon: Settings },
        ]
      case 'teacher':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/marks/enter', label: 'Enter Marks', icon: Edit3 },
          { href: '/view-marks', label: 'View Marks', icon: Eye },
          { href: '/attendance', label: 'Attendance', icon: Calendar },
          { href: '/finance/requisitions', label: 'Requisitions', icon: ClipboardList },
        ]
      case 'bursar':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/fees', label: 'Fee Management', icon: DollarSign },
          { href: '/finance', label: 'Finance', icon: DollarSign },
          { href: '/finance/budget', label: 'Budget', icon: DollarSign },
          { href: '/finance/requisitions', label: 'Requisitions', icon: ClipboardList },
          { href: '/reports/financial', label: 'Financial Reports', icon: BarChart3 },
        ]
      case 'librarian':
        return [
          { href: '/library', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/library/books', label: 'Books', icon: BookOpen },
          { href: '/library/issues', label: 'Book Issues', icon: ClipboardList },
          { href: '/library/reports', label: 'Reports', icon: BarChart3 },
          { href: '/finance/requisitions', label: 'Requisitions', icon: ClipboardList },
        ]
      case 'nurse':
        return [
          { href: '/clinic', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/clinic/visits', label: 'Patient Visits', icon: ClipboardList },
          { href: '/clinic/health-profiles', label: 'Health Profiles', icon: FileText },
          { href: '/clinic/medicines', label: 'Medicine Inventory', icon: Pill },
          { href: '/clinic/emergencies', label: 'Emergency Incidents', icon: Stethoscope },
          { href: '/clinic/reports', label: 'Health Reports', icon: BarChart3 },
          { href: '/finance/requisitions', label: 'Requisitions', icon: ClipboardList },
        ]
      case 'storekeeper':
        return [
          { href: '/storekeeper', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/storekeeper/inventory', label: 'Inventory', icon: Package },
        ]
      case 'parent':
        return [
          { href: '/parent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/parent/attendance', label: 'Attendance', icon: Calendar },
          { href: '/parent/results', label: 'Results', icon: ClipboardList },
          { href: '/parent/fees', label: 'Fees', icon: DollarSign },
          { href: '/parent/health', label: 'Health', icon: Stethoscope },
          { href: '/parent/settings', label: 'Settings', icon: Settings },
        ]
      default:
        return [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const menuItems = getMenuItems()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <School className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Acadistra</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <div className="flex-1"></div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => toggleColorScheme()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {colorScheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}