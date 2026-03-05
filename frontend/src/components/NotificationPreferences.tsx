'use client'

import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { Bell, Mail, MessageSquare, Save, Loader2 } from 'lucide-react'

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState({
    sms_enabled: true,
    email_enabled: true,
    fees_reminders: true,
    payment_confirm: true,
    results_notify: true,
    attendance_alert: true,
    announcements: true,
    weekly_summary: false,
    monthly_summary: true
  })

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const res = await api.get('/notifications/preferences')
      if (res.data.preferences) {
        setPreferences(res.data.preferences)
      }
    } catch (error) {
      console.error('Load preferences error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/notifications/preferences', preferences)
      alert('Preferences saved successfully!')
    } catch (error) {
      alert('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-600">Manage how you receive updates</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Notification Channels */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Notification Channels
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-gray-900">SMS Notifications</div>
                  <div className="text-sm text-gray-600">Receive updates via text message</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.sms_enabled}
                onChange={() => togglePreference('sms_enabled')}
                className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">Email Notifications</div>
                  <div className="text-sm text-gray-600">Receive updates via email</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_enabled}
                onChange={() => togglePreference('email_enabled')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What to Notify Me About</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <div>
                <div className="font-semibold text-gray-900">💰 Fees Reminders</div>
                <div className="text-sm text-gray-600">Outstanding fees notifications</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.fees_reminders}
                onChange={() => togglePreference('fees_reminders')}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <div>
                <div className="font-semibold text-gray-900">✅ Payment Confirmations</div>
                <div className="text-sm text-gray-600">Instant payment receipts</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.payment_confirm}
                onChange={() => togglePreference('payment_confirm')}
                className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <div>
                <div className="font-semibold text-gray-900">📊 Results Published</div>
                <div className="text-sm text-gray-600">When exam results are available</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.results_notify}
                onChange={() => togglePreference('results_notify')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <div>
                <div className="font-semibold text-gray-900">📅 Attendance Alerts</div>
                <div className="text-sm text-gray-600">Daily attendance updates</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.attendance_alert}
                onChange={() => togglePreference('attendance_alert')}
                className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <div>
                <div className="font-semibold text-gray-900">📢 School Announcements</div>
                <div className="text-sm text-gray-600">General school updates</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.announcements}
                onChange={() => togglePreference('announcements')}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Summary Reports */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Reports</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <div>
                <div className="font-semibold text-gray-900">📅 Weekly Summary</div>
                <div className="text-sm text-gray-600">Attendance & performance summary every week</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.weekly_summary}
                onChange={() => togglePreference('weekly_summary')}
                className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <div>
                <div className="font-semibold text-gray-900">📊 Monthly Summary</div>
                <div className="text-sm text-gray-600">Comprehensive monthly report</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.monthly_summary}
                onChange={() => togglePreference('monthly_summary')}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Preferences
            </>
          )}
        </button>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">💡 Cost Information</p>
          <p>SMS notifications cost approximately UGX 50 per message. Email notifications are free.</p>
        </div>
      </div>
    </div>
  )
}
