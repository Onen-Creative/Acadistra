'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
function RoleBasedDashboard() {
  const router = useRouter()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    
    // Route to specific dashboard based on role
    switch (user.role) {
      case 'system_admin':
        router.push('/dashboard/system-admin')
        break
      case 'school_admin':
        router.push('/dashboard/school-admin')
        break
      case 'teacher':
        router.push('/dashboard/teacher')
        break
      case 'director_of_studies':
      case 'dos':
        router.push('/dashboard/dos')
        break
      case 'bursar':
        router.push('/dashboard/bursar')
        break
      case 'librarian':
        router.push('/library')
        break
      case 'nurse':
        router.push('/dashboard/nurse')
        break
      default:
        router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    
      <RoleBasedDashboard />
    
  )
}