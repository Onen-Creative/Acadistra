'use client'

import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'

import { useState } from 'react'
import api from '@/services/api'
import { PageHeader, LoadingSpinner } from '@/components/ui/BeautifulComponents'

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn: async () => {
      const res = await api.get('/audit-logs', { params: { page, action: actionFilter } })
      return Array.isArray(res.data) ? { logs: res.data } : res.data
    },
    staleTime: 0,
    gcTime: 0,
  })

  return (
    
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader 
            title="Audit Logs" 
            description="System activity and audit trail"
            icon="📜"
          />

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">🔍 Filter by Action</label>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input w-64 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
            </div>

            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">⏰ Timestamp</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">👤 User</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">⚡ Action</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">📁 Resource</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">🌐 IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs?.logs?.map((log: any) => (
                        <tr key={log.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-all duration-200">
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.user_email}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
                              log.action === 'create' ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' :
                              log.action === 'update' ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white' :
                              log.action === 'delete' ? 'bg-gradient-to-r from-red-400 to-red-600 text-white' :
                              'bg-gradient-to-r from-gray-400 to-gray-600 text-white'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{log.resource_type}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 font-mono">{log.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {logs?.logs?.map((log: any) => (
                    <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{log.user_email}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                          log.action === 'create' ? 'bg-green-100 text-green-800' :
                          log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Resource:</span>
                          <span className="text-gray-900 font-medium">{log.resource_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">IP:</span>
                          <span className="text-gray-900 font-mono text-xs">{log.ip}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {logs?.logs?.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No audit logs found</p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-2 rounded-xl font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
              >
                ← Previous
              </button>
              <span className="text-sm font-semibold text-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-xl">Page {page}</span>
              <button 
                onClick={() => setPage(p => p + 1)}
                className="px-6 py-2 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    
  )
}
