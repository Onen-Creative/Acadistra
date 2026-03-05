'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { NotificationPreferences } from '@/components/NotificationPreferences'
import { Settings } from 'lucide-react'

export default function ParentSettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 shadow-2xl text-white">
          <div className="flex items-center gap-4">
            <Settings className="w-12 h-12" />
            <div>
              <h1 className="text-4xl font-bold mb-2">Settings</h1>
              <p className="text-indigo-100 text-lg">Manage your account preferences</p>
            </div>
          </div>
        </div>

        <NotificationPreferences />
      </div>
    </DashboardLayout>
  )
}
