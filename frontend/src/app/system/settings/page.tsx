'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader, LoadingSpinner } from '@/components/ui/BeautifulComponents'
import { useState, useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import { settingsService, SystemSettings } from '@/services/settings'

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    system_name: 'Acadistra',
    support_email: 'support@acadistra.com',
    default_country: 'Uganda',
    two_factor_enabled: false,
    session_timeout: 30,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_username: '',
    auto_backup: true,
    backup_time: '02:00'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const data = await settingsService.getSettings()
      setSettings(data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        notifications.show({ 
          title: 'Error', 
          message: 'Session expired. Please login again.', 
          color: 'red' 
        })
        localStorage.removeItem('token')
        window.location.href = '/login'
      } else {
        notifications.show({ 
          title: 'Error', 
          message: 'Failed to load settings', 
          color: 'red' 
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsService.updateSettings(settings)
      notifications.show({ 
        title: 'Success', 
        message: 'Settings saved successfully', 
        color: 'green' 
      })
    } catch (error: any) {
      if (error.response?.status === 401) {
        notifications.show({ 
          title: 'Error', 
          message: 'Session expired. Please login again.', 
          color: 'red' 
        })
        localStorage.removeItem('token')
        window.location.href = '/login'
      } else {
        notifications.show({ 
          title: 'Error', 
          message: error.response?.data?.error || 'Failed to save settings', 
          color: 'red' 
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRunBackup = async () => {
    setBackingUp(true)
    try {
      await settingsService.runBackup()
      notifications.show({ 
        title: 'Success', 
        message: 'Backup started successfully', 
        color: 'blue' 
      })
    } catch (error) {
      notifications.show({ 
        title: 'Info', 
        message: 'Backup feature will be available soon', 
        color: 'blue' 
      })
    } finally {
      setBackingUp(false)
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
                <button 
                  className="btn-primary w-full" 
                  onClick={handleRunBackup}
                  disabled={backingUp}
                >
                  {backingUp ? '⏳ Running...' : '💾 Run Backup Now'}
                </button>
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
