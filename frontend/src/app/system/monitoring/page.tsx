'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import api from '@/services/api';

interface ActiveUser {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  school_id?: string;
  school_name?: string;
  ip_address: string;
  login_at: string;
  last_activity: string;
}

interface AuditLog {
  id: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  before: any;
  after: any;
  timestamp: string;
  ip: string;
  user_name: string;
  user_email: string;
  school_name?: string;
  class_name?: string;
}

interface SystemStats {
  active_users: number;
  active_sessions: number;
  requests_last_hour: number;
  errors_last_hour: number;
  error_rate: number;
  avg_response_time_ms: number;
  school_activity: Array<{
    school_id: string;
    school_name: string;
    active_users: number;
    active_sessions: number;
  }>;
}

interface DailyReport {
  id: string;
  date: string;
  total_users: number;
  active_users: number;
  total_sessions: number;
  avg_session_duration: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  peak_hour: number;
  peak_hour_requests: number;
  error_rate: number;
}

export default function SystemMonitoringPage() {
  const { user, loading: authLoading } = useRequireAuth(['system_admin']);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    user_role: '',
  });
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes, reportsRes] = await Promise.all([
        api.get('/monitoring/active-users'),
        api.get('/monitoring/system-stats'),
        api.get('/monitoring/daily-reports?days=7'),
      ]);

      setActiveUsers(usersRes.data.users || []);
      setSystemStats(statsRes.data);
      setDailyReports(reportsRes.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (auditFilters.action) params.append('action', auditFilters.action);
      if (auditFilters.user_role) params.append('user_role', auditFilters.user_role);
      params.append('limit', '50');

      const res = await api.get(`/monitoring/audit-logs?${params.toString()}`);
      setAuditLogs(res.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit' && user) {
      fetchAuditLogs();
    }
  }, [activeTab, auditFilters, user]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const getResourceDetails = (log: AuditLog) => {
    if (log.action === 'login' || log.action === 'logout') {
      return 'Authentication';
    }
    
    if (log.after) {
      if (log.resource_type === 'student') {
        const student = log.after;
        return `${student.first_name || ''} ${student.last_name || ''} (${student.admission_no || 'N/A'})`;
      }
      if (log.resource_type === 'result') {
        return `Marks entry`;
      }
      if (log.resource_type === 'class') {
        return log.after.name || 'Class';
      }
      if (log.resource_type === 'user') {
        return log.after.email || 'User';
      }
    }
    
    return log.resource_type;
  };

  const getChangesSummary = (log: AuditLog) => {
    if (log.action === 'create') {
      return 'Created new record';
    }
    if (log.action === 'delete') {
      return 'Deleted record';
    }
    if (log.action === 'update' && log.before && log.after) {
      const changes = [];
      for (const key in log.after) {
        if (log.before[key] !== log.after[key]) {
          changes.push(key);
        }
      }
      return changes.length > 0 ? `Updated: ${changes.join(', ')}` : 'No changes';
    }
    return '';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || isNaN(minutes) || minutes === 0) return '0m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-gray-600">Real-time system monitoring and audit logs</p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'active-users', 'audit', 'reports'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
              >
                {tab.replace('-', ' ')}
                {tab === 'active-users' && ` (${activeUsers.length})`}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && systemStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-3xl font-bold mt-2">{systemStats.active_users}</p>
                <p className="text-xs text-gray-500 mt-1">Currently logged in</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-3xl font-bold mt-2">{systemStats.active_sessions}</p>
                <p className="text-xs text-gray-500 mt-1">Open sessions</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Requests (1h)</p>
                <p className="text-3xl font-bold mt-2">{systemStats.requests_last_hour}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {systemStats.errors_last_hour} errors ({systemStats.error_rate.toFixed(2)}%)
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold mt-2">{systemStats.avg_response_time_ms.toFixed(0)}ms</p>
                <p className="text-xs text-gray-500 mt-1">Last hour average</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">School Activity</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Users</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Sessions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(systemStats.school_activity || []).map((school) => (
                        <tr key={school.school_id}>
                          <td className="px-6 py-4 whitespace-nowrap">{school.school_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{school.active_users}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{school.active_sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'active-users' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Active Users ({activeUsers.length})</h2>
              <p className="text-sm text-gray-600 mb-4">Users logged in within the last 30 minutes</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Login Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeUsers.map((user) => (
                      <tr key={user.user_id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium">{user.user_name}</div>
                          <div className="text-sm text-gray-500">{user.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.user_role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{user.school_name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{user.ip_address}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDateTime(user.login_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDateTime(user.last_activity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Audit Logs</h2>
                <div className="flex gap-2">
                  <select
                    value={auditFilters.action}
                    onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                  </select>
                  <select
                    value={auditFilters.user_role}
                    onChange={(e) => setAuditFilters({ ...auditFilters, user_role: e.target.value })}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="">All Roles</option>
                    <option value="system_admin">System Admin</option>
                    <option value="school_admin">School Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="bursar">Bursar</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDateTime(log.timestamp)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-sm">{log.user_name}</div>
                          <div className="text-xs text-gray-500">{log.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            log.action === 'create' ? 'bg-green-100 text-green-800' :
                            log.action === 'delete' ? 'bg-red-100 text-red-800' :
                            log.action === 'login' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{log.resource_type}</td>
                        <td className="px-6 py-4 text-sm max-w-xs truncate" title={getResourceDetails(log)}>
                          {getResourceDetails(log)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={getChangesSummary(log)}>
                          {getChangesSummary(log)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Generate Report Button */}
            {dailyReports.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-800 mb-4">📊 No daily reports found. Generate reports to see analytics.</p>
                <button
                  onClick={async () => {
                    setGeneratingReport(true);
                    try {
                      // Generate reports for last 7 days
                      const promises = [];
                      for (let i = 1; i <= 7; i++) {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        const dateStr = date.toISOString().split('T')[0];
                        promises.push(api.post(`/monitoring/generate-daily-report?date=${dateStr}`));
                      }
                      await Promise.all(promises);
                      await fetchData();
                      alert('✅ Reports generated successfully!');
                    } catch (error) {
                      console.error('Failed to generate reports:', error);
                      alert('❌ Failed to generate reports');
                    } finally {
                      setGeneratingReport(false);
                    }
                  }}
                  disabled={generatingReport}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingReport ? '⏳ Generating Reports...' : '🔄 Generate Last 7 Days Reports'}
                </button>
              </div>
            )}

            {/* Summary Cards */}
            {dailyReports.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg text-white">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm opacity-90">Active Users (7d)</p>
                    <span className="text-2xl">👥</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {dailyReports.reduce((sum, r) => sum + (r.active_users || 0), 0)}
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    Avg: {Math.round(dailyReports.reduce((sum, r) => sum + (r.active_users || 0), 0) / dailyReports.length || 0)} users/day
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg text-white">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm opacity-90">Total Sessions (7d)</p>
                    <span className="text-2xl">🔐</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {dailyReports.reduce((sum, r) => sum + (r.total_sessions || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    Avg: {Math.round(dailyReports.reduce((sum, r) => sum + (r.total_sessions || 0), 0) / dailyReports.length || 0)}/day
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm opacity-90">Total Requests (7d)</p>
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {(dailyReports.reduce((sum, r) => sum + (r.total_requests || 0), 0) / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    Avg: {Math.round(dailyReports.reduce((sum, r) => sum + (r.total_requests || 0), 0) / dailyReports.length || 0)}/day
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg shadow-lg text-white">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm opacity-90">Avg Success Rate</p>
                    <span className="text-2xl">✅</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {dailyReports.length > 0 ? (
                      ((dailyReports.reduce((sum, r) => {
                        const total = r.total_requests || 1;
                        const successful = r.successful_requests || 0;
                        return sum + (successful / total * 100);
                      }, 0) / dailyReports.length)).toFixed(1)
                    ) : 0}%
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    Last 7 days average
                  </p>
                </div>
              </div>
            )}

            {/* Trend Charts */}
            {dailyReports.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Activity Trend */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-xl">📈</span>
                  User Activity Trend
                </h3>
                <div className="space-y-3">
                  {dailyReports.slice().reverse().map((report, idx) => {
                    const maxUsers = Math.max(...dailyReports.map(r => r.active_users));
                    const percentage = (report.active_users / maxUsers) * 100;
                    return (
                      <div key={report.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="font-semibold">{report.active_users} users</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Response Time Trend */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  Response Time Trend
                </h3>
                <div className="space-y-3">
                  {dailyReports.slice().reverse().map((report) => {
                    const avgResponseTime = report.avg_response_time || 0;
                    const maxTime = Math.max(...dailyReports.map(r => r.avg_response_time || 0));
                    const percentage = maxTime > 0 ? (avgResponseTime / maxTime) * 100 : 0;
                    const isGood = avgResponseTime < 200;
                    return (
                      <div key={report.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="font-semibold">{avgResponseTime.toFixed(0)}ms</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              isGood ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-yellow-500 to-orange-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}

            {/* Peak Hours Analysis */}
            {dailyReports.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">🕐</span>
                Peak Hours Analysis
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {dailyReports.slice().reverse().map((report) => (
                  <div key={report.id} className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                    <p className="text-xs text-gray-600 mb-1">
                      {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-2xl font-bold text-indigo-600">{report.peak_hour || 0}:00</p>
                    <p className="text-xs text-gray-500 mt-1">{report.peak_hour_requests || 0} req</p>
                  </div>
                ))}
              </div>
              </div>
            )}

            {/* Detailed Table */}
            {dailyReports.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  Daily System Reports
                </h2>
                <p className="text-sm text-gray-600 mb-4">Last 7 days detailed system activity</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Users</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requests</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Response</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peak Hour</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dailyReports.slice().reverse().map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium">
                            {new Date(report.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-blue-600">{report.active_users}</span>
                            <span className="text-gray-400"> / {report.total_users}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{report.total_sessions || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatDuration(report.avg_session_duration || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{(report.total_requests || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              (report.error_rate || 0) < 5 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {report.total_requests > 0 ? (((report.successful_requests || 0) / report.total_requests) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-semibold ${
                              (report.avg_response_time || 0) < 200 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {(report.avg_response_time || 0).toFixed(0)}ms
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {report.peak_hour || 0}:00 <span className="text-gray-400">({report.peak_hour_requests || 0})</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
