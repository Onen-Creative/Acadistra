import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicApi, studentsApi, classesApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Sidebar from '@/components/Sidebar';

export default function EmergencyIncidentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 20;

  const { data: classes } = useQuery({
    queryKey: ['classes', term, year],
    queryFn: () => classesApi.list({ term, year }),
    staleTime: 5 * 60 * 1000
  });

  // Get unique class levels
  const uniqueLevels = [...new Set((classes?.classes || classes || []).map((c: any) => c.level))].filter(Boolean);

  const { data: incidents } = useQuery({
    queryKey: ['incidents', term, year, page, startDate, endDate],
    queryFn: () => {
      const params: any = { page, limit, year, term };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      return clinicApi.listIncidents(params);
    }
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsApi.list({ limit: 1000 })
  });

  const createMutation = useMutation({
    mutationFn: clinicApi.createIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-summary'] });
      setShowForm(false);
      toast.success('🚨 Emergency incident reported successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to report incident: ${error.response?.data?.error || error.message}`);
    }
  });

  const filteredIncidents = (Array.isArray(incidents) ? incidents : incidents?.incidents || []).filter((inc: any) => {
    const matchesSearch = !search || 
      inc.student?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      inc.student?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      inc.description?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = !classFilter || inc.student?.class?.level === classFilter;
    return matchesSearch && matchesClass;
  }) || [];

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
              <h1 className="text-xl font-bold">🚨 Emergency Incidents</h1>
            </div>
            <div className="flex items-center gap-4">
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="border rounded px-3 py-1">
                <option value="Term1">Term 1</option>
                <option value="Term2">Term 2</option>
                <option value="Term3">Term 3</option>
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded px-3 py-1">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
                ← Back
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                className="border rounded-lg px-4 py-2 flex-1"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                className="border rounded-lg px-4 py-2 flex-1"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search incidents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border rounded-lg px-4 py-2"
              />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="border rounded-lg px-4 py-2 flex-1 sm:flex-initial"
              >
                <option value="">All Classes</option>
                {uniqueLevels.map((level: string) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <button
                onClick={() => setShowForm(true)}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 whitespace-nowrap"
              >
                + Report Emergency
              </button>
            </div>
          </div>

          {showForm && (
            <IncidentForm
              students={students?.students || []}
              onClose={() => setShowForm(false)}
              onSubmit={(data) => createMutation.mutate(data)}
            />
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Taken</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIncidents.map((incident: any) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                        <div>{new Date(incident.incident_date).toLocaleDateString()}</div>
                        <div className="text-gray-500">{new Date(incident.incident_date).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium">
                        {incident.student?.first_name} {incident.student?.last_name}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm">{incident.student?.class?.level || '-'}</td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          {incident.incident_type}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm max-w-xs truncate">{incident.description}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm max-w-xs truncate">{incident.action_taken}</td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">
                        {incident.parent_notified ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-yellow-600">⚠</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={filteredIncidents.length < limit}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function IncidentForm({ students, onClose, onSubmit }: { students: any[]; onClose: () => void; onSubmit: (data: any) => void }) {
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    student_id: '',
    incident_type: 'accident',
    description: '',
    action_taken: '',
    parent_notified: false,
    referral_details: '',
    outcome: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      incident_date: new Date().toISOString(),
      year: year,
      term: term
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-red-600">Report Emergency Incident</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Student *</label>
            <select
              required
              value={formData.student_id}
              onChange={(e) => setFormData({...formData, student_id: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select student</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} - {s.admission_no}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Incident Type *</label>
            <select
              value={formData.incident_type}
              onChange={(e) => setFormData({...formData, incident_type: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="accident">Accident</option>
              <option value="severe_illness">Severe Illness</option>
              <option value="injury">Injury</option>
              <option value="seizure">Seizure</option>
              <option value="allergic_reaction">Allergic Reaction</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={formData.parent_notified}
                onChange={(e) => setFormData({...formData, parent_notified: e.target.checked})}
              />
              <span className="text-sm font-medium">Parent Notified</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Describe what happened..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Action Taken *</label>
            <textarea
              required
              value={formData.action_taken}
              onChange={(e) => setFormData({...formData, action_taken: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="What actions were taken..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Referral Details</label>
            <textarea
              value={formData.referral_details}
              onChange={(e) => setFormData({...formData, referral_details: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Hospital name, ambulance details, etc."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Outcome</label>
            <input
              value={formData.outcome}
              onChange={(e) => setFormData({...formData, outcome: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Current status or outcome"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">
            Report Incident
          </button>
          <button type="button" onClick={onClose} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
