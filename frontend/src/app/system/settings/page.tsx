'use client'

import { DashboardLayout } from '@/components/DashboardLayout'

import { PageHeader, LoadingSpinner } from '@/components/ui/BeautifulComponents'
import { useState, useEffect } from 'react'
import { notifications } from '@mantine/notifications'

interface Settings {
  system_name: string
  support_email: string
  default_country: string
  two_factor_enabled: boolean
  session_timeout: number
  smtp_host: string
  smtp_port: number
  smtp_username: string
  auto_backup: boolean
  backup_time: string
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    system_name: 'Acadistra',
    support_email: 'support@acadistra.com',
    default_country: 'Uganda',
    two_factor_enabled: false,
    session_timeout: 30,
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    auto_backup: true,
    backup_time: '02:00'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }
      const res = await fetch('http://localhost:8080/api/v1/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      } else if (res.status === 401) {
        notifications.show({ title: 'Error', message: 'Session expired. Please login again.', color: 'red' })
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        notifications.show({ title: 'Error', message: 'Please login first', color: 'red' })
        setSaving(false)
        return
      }
      
      
      const res = await fetch('http://localhost:8080/api/v1/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        notifications.show({ title: 'Success', message: 'Settings saved successfully', color: 'green' })
      } else if (res.status === 401) {
        notifications.show({ title: 'Error', message: 'Session expired. Please login again.', color: 'red' })
        localStorage.removeItem('token')
        window.location.href = '/login'
      } else {
        notifications.show({ title: 'Error', message: data.error || 'Failed to save settings', color: 'red' })
      }
    } catch (error) {
      console.error('Save error:', error)
      notifications.show({ title: 'Error', message: 'Failed to save settings', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>

  return (
    
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader 
            title="System Settings" 
            description="Configure system-wide settings"
            icon="⚙️"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🌐</span>
                General Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">System Name</label>
                  <input 
                    className="input" 
                    value={settings.system_name}
                    onChange={(e) => setSettings({...settings, system_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Support Email</label>
                  <input 
                    type="email" 
                    className="input" 
                    value={settings.support_email}
                    onChange={(e) => setSettings({...settings, support_email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Default Country</label>
                  <input 
                    className="input" 
                    value={settings.default_country}
                    onChange={(e) => setSettings({...settings, default_country: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🔒</span>
                Security Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600">Require 2FA for all admins</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="toggle" 
                    checked={settings.two_factor_enabled}
                    onChange={(e) => setSettings({...settings, two_factor_enabled: e.target.checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Timeout</p>
                    <p className="text-sm text-gray-600">Auto logout after inactivity</p>
                  </div>
                  <select 
                    className="input w-32"
                    value={settings.session_timeout}
                    onChange={(e) => setSettings({...settings, session_timeout: parseInt(e.target.value)})}
                  >
                    <option value="30">30 min</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">📧</span>
                Email Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">SMTP Host</label>
                  <input 
                    className="input" 
                    placeholder="smtp.gmail.com"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">SMTP Port</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({...settings, smtp_port: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="label">SMTP Username</label>
                  <input 
                    className="input"
                    value={settings.smtp_username}
                    onChange={(e) => setSettings({...settings, smtp_username: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">💾</span>
                Backup & Maintenance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto Backup</p>
                    <p className="text-sm text-gray-600">Daily database backups</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="toggle" 
                    checked={settings.auto_backup}
                    onChange={(e) => setSettings({...settings, auto_backup: e.target.checked})}
                  />
                </div>
                <div>
                  <label className="label">Backup Time</label>
                  <input 
                    type="time" 
                    className="input" 
                    value={settings.backup_time}
                    onChange={(e) => setSettings({...settings, backup_time: e.target.value})}
                  />
                </div>
                <button className="btn-primary w-full" onClick={() => notifications.show({ title: 'Success', message: 'Backup started', color: 'blue' })}>Run Backup Now</button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '💾 Saving...' : '💾 Save Settings'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    
  )
}
