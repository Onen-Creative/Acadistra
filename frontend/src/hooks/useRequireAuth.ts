'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useRequireAuth(allowedRoles?: string[]) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user')
    
    if (!token) {
      router.replace('/login')
      return
    }
    
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      
      if (allowedRoles && !allowedRoles.includes(parsedUser.role)) {
        // Redirect to appropriate page based on role
        const redirectPath = parsedUser.role === 'system_admin' ? '/dashboard/system-admin'
          : parsedUser.role === 'school_admin' ? '/dashboard/school-admin'
          : parsedUser.role === 'director_of_studies' ? '/dashboard'
          : parsedUser.role === 'dos' ? '/dashboard'
          : parsedUser.role === 'nurse' ? '/clinic'
          : parsedUser.role === 'storekeeper' ? '/storekeeper'
          : '/dashboard'
        router.replace(redirectPath)
      }
    }
  }, [router])

  return { user }
}
