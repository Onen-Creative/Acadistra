import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clinicApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: summary } = useQuery({
    queryKey: ['clinic-summary', dateRange],
    queryFn: () => clinicApi.getSummary({ start_date: dateRange.start, end_date: dateRange.end })
  });

  const { data: visits } = useQuery({
    queryKey: ['visits-report', dateRange],
    queryFn: () => clinicApi.listVisits({ limit: 1000 })
  });

  const { data: tests } = useQuery({
    queryKey: ['tests-report'],
    queryFn: () => clinicApi.listTests()
  });

  // Calculate analytics
  const outcomeStats = visits?.visits?.reduce((acc: any, visit: any) => {
    acc[visit.outcome] = (acc[visit.outcome] || 0) + 1;
    return acc;
  }, {}) || {};

  const testStats = tests?.tests?.reduce((acc: any, test: any) => {
    acc[test.test_type] = (acc[test.test_type] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="nurse" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-bold">📈 Reports & Analytics</h1>
            </div>
            <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
              ← Back
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Date Range Selector */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="font-semibold mb-3">Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Visits" value={summary?.total_visits || 0} color="blue" />
            <StatCard title="Malaria Tests" value={summary?.malaria_tests_count || 0} color="green" />
            <StatCard title="Pregnancy Tests" value={summary?.pregnancy_tests_count || 0} color="purple" />
            <StatCard title="Emergencies" value={summary?.emergencies || 0} color="red" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Visit Outcomes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Visit Outcomes</h3>
              <div className="space-y-3">
                {Object.entries(outcomeStats).map(([outcome, count]: any) => (
                  <div key={outcome} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{outcome.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / (summary?.total_visits || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Types */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Medical Tests Performed</h3>
              <div className="space-y-3">
                {Object.entries(testStats).map(([type, count]: any) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(count / (tests?.tests?.length || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory Status */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">Inventory Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{summary?.total_medicines || 0}</p>
                <p className="text-sm text-gray-600">Total Medicines</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{summary?.low_stock_medicines || 0}</p>
                <p className="text-sm text-gray-600">Low Stock Medicines</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{summary?.expiring_medicines || 0}</p>
                <p className="text-sm text-gray-600">Expiring Soon</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{summary?.low_stock_consumables || 0}</p>
                <p className="text-sm text-gray-600">Low Stock Consumables</p>
              </div>
            </div>
          </div>

          {/* Common Illnesses */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Common Symptoms/Diagnoses</h3>
            <div className="space-y-2">
              {visits?.visits?.slice(0, 10).map((visit: any) => (
                <div key={visit.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{visit.diagnosis || visit.symptoms?.substring(0, 50)}</span>
                  <span className="text-xs text-gray-500">{new Date(visit.visit_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: 'blue' | 'green' | 'purple' | 'red' }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-lg shadow p-4 text-white`}>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm opacity-90">{title}</p>
    </div>
  );
}
