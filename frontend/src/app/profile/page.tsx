'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { api } from '@/services/api'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      setUser(userData)
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-indigo-600">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 text-white">
              <h1 className="text-3xl font-bold">{user?.full_name || 'User'}</h1>
              <p className="text-indigo-100 mt-1">{user?.email}</p>
              <div className="flex gap-3 mt-3">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{user?.role?.replace('_', ' ').toUpperCase()}</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{user?.school_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'overview', label: 'Overview', icon: '👤' },
                { id: 'account', label: 'Account', icon: '⚙️' },
                { id: 'activity', label: 'Activity', icon: '📊' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-base font-medium text-gray-900">{user?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="text-base font-medium text-gray-900">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">User ID</p>
                  <p className="text-base font-medium text-gray-900 font-mono text-sm">{user?.id || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">School Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">School Name</p>
                  <p className="text-base font-medium text-gray-900">{user?.school_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">School ID</p>
                  <p className="text-base font-medium text-gray-900 font-mono text-sm">{user?.school_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="text-base font-medium text-gray-900">{user?.role?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-flex px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                    Active
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="text-base font-medium text-gray-900">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Change Password
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Download My Data
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Email Preferences</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700">Receive email notifications</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700">Receive system updates</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">Receive marketing emails</span>
                  </label>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-3">Security</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-500">Add an extra layer of security</p>
                    </div>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                      Enable
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Active Sessions</p>
                      <p className="text-xs text-gray-500">Manage your active sessions</p>
                    </div>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                      View
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-red-600 mb-3">Danger Zone</h4>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800 mb-3">Once you delete your account, there is no going back.</p>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {[
                { action: 'Logged in', time: '2 hours ago', icon: '🔐' },
                { action: 'Updated profile', time: '1 day ago', icon: '✏️' },
                { action: 'Changed password', time: '3 days ago', icon: '🔒' },
                { action: 'Logged in', time: '5 days ago', icon: '🔐' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Change Password</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input type="password" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input type="password" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input type="password" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
