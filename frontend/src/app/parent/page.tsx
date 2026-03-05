'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ParentPortal() {
  const router = useRouter()

  useEffect(() => {
    router.push('/parent/dashboard')
  }, [])

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600"></div>
    </div>
  )
}
