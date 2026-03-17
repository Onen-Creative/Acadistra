'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import Link from 'next/link'
import api from '@/services/api'

export default function SystemAdminDashboard() {
  useRequireAuth()
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['system-stats'],
    queryFn: () => api.get('/api/v1/stats').then(res => res.data),
  })

  const StatCard = ({ title, value, icon, gradient, link, trend }: any) => (
    <Link href={link} className="group">
      <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br ${gradient}`}>
        <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
          <div className="text-8xl">{icon}</div>
        </div>
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium mb-2">{title}</p>
          <p className="text-white text-4xl font-bold mb-1">{value || 0}</p>
          {trend && <p className="text-white/70 text-xs">{trend}</p>}
        </div>
      </div>
    </Link>
  )

  const QuickAction = ({ title, description, icon, link, color }: any) => (
    <Link href={link} className="group">
      <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-transparent">
        <div className="flex items-start space-x-4">
          <div className={`p-4 rounded-xl ${color} transform group-hover:scale-110 transition-transform duration-300`}>
            <span className="text-3xl">{icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )

  if (isLoading) {
    return (
      <DashboardLayout>
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0"></div>
            </div>
          </div>
        </DashboardLayout>
      )
  }

  return (
    <DashboardLayout>
        <div className="space-y-8">
          {/* Header with Gradient */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-8 shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">System Dashboard</h1>
                <p className="text-blue-100 text-lg">Manage all schools and system-wide settings</p>
              </div>
              <div className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <div className={`w-3 h-3 rounded-full ${stats?.health?.status === 'healthy' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-white font-medium">System {stats?.health?.status || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid with Gradients */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Schools"
              value={stats?.total_schools}
              icon="🏫"
              gradient="from-blue-500 to-blue-700"
              link="/system/schools"
              trend="+2 this month"
            />
            <StatCard
              title="Total Users"
              value={stats?.total_users}
              icon="👥"
              gradient="from-emerald-500 to-teal-700"
              link="/system/users"
              trend="Active accounts"
            />
            <StatCard
              title="Total Students"
              value={stats?.total_students}
              icon="🎓"
              gradient="from-purple-500 to-pink-700"
              link="/system/schools"
              trend="Enrolled students"
            />
            <StatCard
              title="System Health"
              value={`${stats?.health?.uptime_percent || 99.9}%`}
              icon="💚"
              gradient="from-orange-500 to-red-600"
              link="/system/reports"
              trend="Uptime"
            />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Quick Actions</span>
              <div className="ml-3 h-1 flex-1 bg-gradient-to-r from-blue-600/20 to-transparent rounded"></div>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <QuickAction
                title="Create New School"
                description="Register a new school in the system"
                icon="➕"
                color="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600"
                link="/system/schools"
              />
              <QuickAction
                title="Manage Schools"
                description="View and manage all registered schools"
                icon="🏫"
                color="bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600"
                link="/system/schools"
              />
              <QuickAction
                title="User Management"
                description="Manage system users and permissions"
                icon="👤"
                color="bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600"
                link="/system/users"
              />
              <QuickAction
                title="System Settings"
                description="Configure system-wide settings"
                icon="⚙️"
                color="bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600"
                link="/system/settings"
              />
              <QuickAction
                title="Audit Logs"
                description="View system activity and audit trails"
                icon="📋"
                color="bg-gradient-to-br from-red-50 to-red-100 text-red-600"
                link="/system/audit-logs"
              />
              <QuickAction
                title="Reports & Analytics"
                description="Generate system-wide reports"
                icon="📊"
                color="bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600"
                link="/system/reports"
              />
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 w-1 h-6 rounded-full mr-3"></span>
                Schools by Type
              </h3>
              <div className="space-y-4">
                {stats?.schools_by_type && Object.entries(stats.schools_by_type).map(([type, count]: any) => (
                  <div key={type} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 capitalize group-hover:text-blue-600 transition-colors">{type.replace('_', ' ')}</span>
                      <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(count / (stats?.total_schools || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 w-1 h-6 rounded-full mr-3"></span>
                Users by Role
              </h3>
              <div className="space-y-4">
                {stats?.users_by_role && Object.entries(stats.users_by_role).map(([role, count]: any) => (
                  <div key={role} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 capitalize group-hover:text-emerald-600 transition-colors">{role.replace('_', ' ')}</span>
                      <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(count / (stats?.total_users || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Schools Overview Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Schools Overview</h3>
                <Link href="/system/schools" className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center group">
                  View all
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">School</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Users</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Students</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats?.users_by_school?.slice(0, 5).map((school: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {school.school_name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{school.school_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">Active</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                          {school.user_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                          {stats?.students_by_school?.find((s: any) => s.school_name === school.school_name)?.student_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm">
                          ● Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </DashboardLayout>
  )
}
