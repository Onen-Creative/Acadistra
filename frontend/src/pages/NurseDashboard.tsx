import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clinicApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import FilterBar from '@/components/FilterBar';
import Alert from '@/components/Alert';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(2026);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useWebSocket(['clinic:', 'health:', 'visit:', 'medicine:', 'incident:']);

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['clinic-summary', term, year, selectedDate],
    queryFn: () => {
      console.log('Fetching summary with:', { term, year, start_date: selectedDate, end_date: selectedDate });
      return clinicApi.getSummary({ term, year, start_date: selectedDate, end_date: selectedDate });
    },
    onSuccess: (data) => {
      console.log('Summary data received:', data);
    },
    onError: (error: any) => {
      console.error('Summary fetch error:', error);
    }
  });

  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-list', term, year],
    queryFn: () => clinicApi.listMedicines({ limit: 100, year, term })
  });

  const { data: consumablesData } = useQuery({
    queryKey: ['consumables-list', term, year],
    queryFn: () => clinicApi.listConsumables({ limit: 100, year, term })
  });

  const { data: alerts } = useQuery({
    queryKey: ['clinic-alerts', medicinesData, consumablesData],
    queryFn: async () => {
      const medicines = medicinesData?.medicines || [];
      const consumables = consumablesData?.consumables || [];
      
      return {
        lowStockMedicines: medicines.filter((m: any) => m.quantity <= (m.reorder_level || m.minimum_stock || 10)),
        lowStockConsumables: consumables.filter((c: any) => c.quantity <= (c.reorder_level || c.minimum_stock || 10)),
        expiringMedicines: medicines.filter((m: any) => {
          if (!m.expiry_date) return false;
          const daysUntilExpiry = Math.floor((new Date(m.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        })
      };
    },
    enabled: !!medicinesData && !!consumablesData
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="nurse" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64">
        <DashboardHeader
          title="Nurse Dashboard"
          subtitle="Welcome back, Nurse"
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <FilterBar
            term={term}
            year={year}
            search={search}
            onTermChange={setTerm}
            onYearChange={setYear}
            onSearchChange={setSearch}
            searchPlaceholder="Search visits..."
          />
          {/* Date Filter */}
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-lg px-4 py-2 w-full sm:w-auto"
            />
          </div>

          {/* Alerts Section */}
          {(alerts?.lowStockMedicines?.length > 0 || alerts?.lowStockConsumables?.length > 0 || alerts?.expiringMedicines?.length > 0) && (
            <div className="mb-6 space-y-3">
              {alerts?.lowStockMedicines?.map((med: any) => (
                <Alert
                  key={med.id}
                  type="low_stock"
                  message={`Low Stock: ${med.name} - Only ${med.quantity} ${med.unit} remaining`}
                />
              ))}
              {alerts?.lowStockConsumables?.map((item: any) => (
                <Alert
                  key={item.id}
                  type="low_stock"
                  message={`Low Stock: ${item.name} - Only ${item.quantity} ${item.unit} remaining`}
                />
              ))}
              {alerts?.expiringMedicines?.map((med: any) => (
                <Alert
                  key={med.id}
                  type="expiry"
                  message={`Expiring Soon: ${med.name} - Expires on ${new Date(med.expiry_date).toLocaleDateString()}`}
                />
              ))}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard title="Today's Visits" value={summary?.total_visits || 0} icon="🩺" color="blue" />
            <StatCard title="Sent Home" value={summary?.students_sent_home || 0} icon="🏠" color="orange" />
            <StatCard title="Referrals" value={summary?.referrals || 0} icon="🏥" color="red" />
            <StatCard title="Emergencies" value={summary?.emergencies || 0} icon="🚨" color="red" />
            <StatCard title="Low Stock" value={(alerts?.lowStockMedicines?.length || 0) + (alerts?.lowStockConsumables?.length || 0)} icon="📦" color="yellow" />
          </div>

          {/* Inventory Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">💊 Medicines ({medicinesData?.medicines?.length || 0})</h2>
                <button onClick={() => navigate('/clinic/medicines')} className="text-blue-600 text-sm hover:underline">View All</button>
              </div>
              <div className="space-y-2">
                {(medicinesData?.medicines || []).slice(0, 5).map((med: any) => (
                  <div key={med.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{med.name}</p>
                      <p className="text-xs text-gray-500">{med.category} • {med.dosage_form}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${med.quantity <= (med.minimum_stock || 10) ? 'text-red-600' : 'text-green-600'}`}>
                        {med.quantity} {med.unit}
                      </p>
                      {med.quantity <= (med.minimum_stock || 10) && <p className="text-xs text-red-500">Low Stock</p>}
                    </div>
                  </div>
                ))}
                {(!medicinesData?.medicines || medicinesData.medicines.length === 0) && (
                  <p className="text-gray-500 text-center py-4">No medicines in inventory</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">🧴 Consumables ({consumablesData?.consumables?.length || 0})</h2>
                <button onClick={() => navigate('/clinic/consumables')} className="text-blue-600 text-sm hover:underline">View All</button>
              </div>
              <div className="space-y-2">
                {(consumablesData?.consumables || []).slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${item.quantity <= (item.minimum_stock || 10) ? 'text-red-600' : 'text-green-600'}`}>
                        {item.quantity} {item.unit}
                      </p>
                      {item.quantity <= (item.minimum_stock || 10) && <p className="text-xs text-red-500">Low Stock</p>}
                    </div>
                  </div>
                ))}
                {(!consumablesData?.consumables || consumablesData.consumables.length === 0) && (
                  <p className="text-gray-500 text-center py-4">No consumables in inventory</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickActionButton
                icon="🩺"
                label="New Visit"
                onClick={() => navigate('/clinic/visits')}
              />
              <QuickActionButton
                icon="🧪"
                label="Record Test"
                onClick={() => navigate('/clinic/tests')}
              />
              <QuickActionButton
                icon="💊"
                label="Add Medicine"
                onClick={() => navigate('/clinic/medicines')}
              />
              <QuickActionButton
                icon="🚨"
                label="Report Emergency"
                onClick={() => navigate('/clinic/incidents')}
              />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <RecentActivity />
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: 'blue' | 'orange' | 'red' | 'yellow' | 'green' }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600',
    green: 'from-green-500 to-green-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-lg shadow-lg p-4 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="text-sm opacity-90">{title}</p>
    </div>
  );
}

function QuickActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}

function RecentActivity() {
  const [term] = useState('Term1');
  const [year] = useState(new Date().getFullYear());
  
  const { data: visits } = useQuery({
    queryKey: ['recent-visits', term, year],
    queryFn: () => clinicApi.listVisits({ limit: 5, term, year })
  });

  // Helper to get student's current class
  const getStudentClass = (student: any) => {
    const activeEnrollment = student?.enrollments?.find((e: any) => e.status === 'active');
    return activeEnrollment?.class?.name || activeEnrollment?.class?.level || 'N/A';
  };

  return (
    <div className="space-y-3">
      {visits?.visits?.map((visit: any) => (
        <div key={visit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-lg">🩺</span>
            </div>
            <div>
              <p className="font-medium text-sm">
                {visit.student?.first_name} {visit.student?.last_name}
              </p>
              <p className="text-xs text-gray-600">
                {getStudentClass(visit.student)} • {visit.symptoms?.substring(0, 40)}...
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(visit.visit_date).toLocaleTimeString()}
          </span>
        </div>
      ))}
      {(!visits?.visits || visits.visits.length === 0) && (
        <p className="text-gray-500 text-center py-4">No recent visits</p>
      )}
    </div>
  );
}
