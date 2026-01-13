import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicApi, studentsApi, classesApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ConfirmDialog';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import Alert from '@/components/Alert';

export default function ClinicVisitsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [viewingVisit, setViewingVisit] = useState<any>(null);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const limit = 20;
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose } = useConfirm();

  const { data: visits } = useQuery({
    queryKey: ['clinic-visits', selectedStudent, term, year, page, startDate, endDate],
    queryFn: () => {
      const params: any = { page, limit, year, term };
      if (selectedStudent) params.student_id = selectedStudent;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      return clinicApi.listVisits(params);
    }
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsApi.list({ limit: 1000 })
  });

  const { data: classes } = useQuery({
    queryKey: ['classes', term, year],
    queryFn: () => classesApi.list({ term, year }),
    staleTime: 5 * 60 * 1000
  });

  // Get unique class levels
  const uniqueLevels = [...new Set((classes?.classes || classes || []).map((c: any) => c.level))].filter(Boolean);

  // Helper to get student's current class from enrollments
  const getStudentClass = (student: any) => {
    const activeEnrollment = student?.enrollments?.find((e: any) => e.status === 'active');
    return activeEnrollment?.class?.name || activeEnrollment?.class?.level || '-';
  };

  const createMutation = useMutation({
    mutationFn: clinicApi.createVisit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-visits'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-summary'] });
      setShowForm(false);
      toast.success('🎉 Clinic visit recorded successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to record visit: ${error.response?.data?.error || error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clinicApi.updateVisit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-visits'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-summary'] });
      setEditingVisit(null);
      toast.success('✅ Visit updated successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to update visit: ${error.response?.data?.error || error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clinicApi.deleteVisit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-visits'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-summary'] });
      toast.success('🗑️ Visit deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to delete visit: ${error.response?.data?.error || error.message}`);
    }
  });

  const filteredVisits = visits?.visits?.filter((visit: any) => {
    const matchesSearch = !search ||
      visit.student?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      visit.student?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      visit.symptoms?.toLowerCase().includes(search.toLowerCase()) ||
      visit.diagnosis?.toLowerCase().includes(search.toLowerCase());
    const studentClass = getStudentClass(visit.student);
    const matchesClass = !classFilter || studentClass.includes(classFilter);
    return matchesSearch && matchesClass;
  }) || [];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role="nurse" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-hidden">
        <DashboardHeader
          title="🩺 Clinic Visits"
          subtitle="Record and manage student clinic visits"
          onMenuClick={() => setSidebarOpen(true)}
          showFilters
          term={term}
          year={year}
          search={search}
          onTermChange={setTerm}
          onYearChange={setYear}
          onSearchChange={setSearch}
        />

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
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="border rounded-lg px-4 py-2 flex-1"
              >
                <option value="">All Students</option>
                {students?.students?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} - {s.admission_no}
                  </option>
                ))}
              </select>
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
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                + New Visit
              </button>
            </div>
          </div>



          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-teal-50 to-cyan-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Time</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Student</th>
                    <th className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Class</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Chief Complaint</th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Vitals</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Outcome</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVisits.map((visit: any) => (
                    <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {new Date(visit.visit_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-teal-100 rounded-full flex items-center justify-center">
                            <span className="text-teal-600 font-semibold text-xs sm:text-sm">
                              {visit.student?.first_name?.charAt(0)}{visit.student?.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-2 sm:ml-3">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                              {visit.student?.first_name} {visit.student?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{visit.student?.admission_no}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                        {getStudentClass(visit.student)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm text-gray-900 max-w-[150px] sm:max-w-xs truncate">{visit.symptoms}</div>
                        {visit.diagnosis && (
                          <div className="text-xs text-gray-500 mt-1 truncate">Dx: {visit.diagnosis}</div>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm space-y-1">
                          {visit.temperature && (
                            <div className="flex items-center text-gray-700">
                              <span className="text-red-500 mr-1">🌡️</span>
                              {visit.temperature}°C
                            </div>
                          )}
                          {visit.blood_pressure && (
                            <div className="flex items-center text-gray-700">
                              <span className="text-blue-500 mr-1">💓</span>
                              {visit.blood_pressure}
                            </div>
                          )}
                          {visit.pulse && (
                            <div className="flex items-center text-gray-700">
                              <span className="text-pink-500 mr-1">💗</span>
                              {visit.pulse} bpm
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className={`px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          visit.outcome === 'returned_to_class' ? 'bg-green-100 text-green-800' :
                          visit.outcome === 'rest_at_clinic' ? 'bg-blue-100 text-blue-800' :
                          visit.outcome === 'rest_at_dormitory' ? 'bg-indigo-100 text-indigo-800' :
                          visit.outcome === 'sent_home' ? 'bg-orange-100 text-orange-800' :
                          visit.outcome === 'referred' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          <span className="hidden sm:inline">{visit.outcome?.replace('_', ' ')}</span>
                          <span className="sm:hidden">{visit.outcome?.split('_')[0]}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setViewingVisit(visit)}
                            className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setEditingVisit(visit)}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => confirm(
                              {
                                title: 'Delete Clinic Visit',
                                message: 'Are you sure you want to delete this clinic visit? This action cannot be undone and all associated tests and medications will be removed.',
                                confirmText: 'Delete Visit',
                                type: 'danger'
                              },
                              () => deleteMutation.mutate(visit.id)
                            )}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
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
              disabled={filteredVisits.length < limit}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </main>
      </div>

      {(showForm || editingVisit) && (
        <VisitFormModal
          students={students?.students || []}
          onClose={() => {
            setShowForm(false);
            setEditingVisit(null);
          }}
          onSubmit={(data) => {
            if (editingVisit) {
              updateMutation.mutate({ id: editingVisit.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          initialData={editingVisit}
        />
      )}

      {viewingVisit && (
        <ViewVisitModal visit={viewingVisit} onClose={() => setViewingVisit(null)} />
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmOptions.title}
        message={confirmOptions.message}
        confirmText={confirmOptions.confirmText}
        cancelText={confirmOptions.cancelText}
        type={confirmOptions.type}
      />
    </div>
  );
}

function VisitFormModal({ students, onClose, onSubmit, initialData }: { students: any[]; onClose: () => void; onSubmit: (data: any) => void; initialData?: any }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{initialData ? 'Edit' : 'New'} Clinic Visit</h2>
              <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <VisitForm students={students} onClose={onClose} onSubmit={onSubmit} initialData={initialData} />
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitForm({ students, onClose, onSubmit, initialData }: { students: any[]; onClose: () => void; onSubmit: (data: any) => void; initialData?: any }) {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState(initialData?.term || 'Term1');
  const [year, setYear] = useState(initialData?.year || new Date().getFullYear());
  const [formData, setFormData] = useState({
    student_id: initialData?.student_id || '',
    symptoms: initialData?.symptoms || '',
    assessment: initialData?.assessment || '',
    diagnosis: initialData?.diagnosis || '',
    treatment: initialData?.treatment || '',
    outcome: initialData?.outcome || 'returned_to_class',
    temperature: initialData?.temperature ? initialData.temperature.toString() : '',
    blood_pressure: initialData?.blood_pressure || '',
    pulse: initialData?.pulse ? initialData.pulse.toString() : '',
    notes: initialData?.notes || ''
  });

  const [tests, setTests] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [studentAlerts, setStudentAlerts] = useState<any>(null);

  // Fetch existing tests and medications when editing
  const { data: existingTests } = useQuery({
    queryKey: ['visit-tests', initialData?.id],
    queryFn: () => clinicApi.listTests({ visit_id: initialData.id }),
    enabled: !!initialData?.id,
    select: (data) => data?.tests || []
  });

  const { data: existingMedications } = useQuery({
    queryKey: ['visit-medications', initialData?.id],
    queryFn: () => clinicApi.getMedicationHistory({ visit_id: initialData.id }),
    enabled: !!initialData?.id,
    select: (data) => data?.history || []
  });

  // Load existing tests and medications into state
  useEffect(() => {
    if (existingTests && existingTests.length > 0 && tests.length === 0) {
      setTests(existingTests.map((t: any) => ({
        test_type: t.test_type,
        result: t.result,
        notes: t.reason || t.notes || '',
        student_id: t.student_id,
        test_date: t.test_date
      })));
    }
  }, [existingTests]);

  useEffect(() => {
    if (existingMedications && existingMedications.length > 0 && medications.length === 0) {
      setMedications(existingMedications.map((m: any) => ({
        medicine_id: m.medicine_id,
        medicine_name: m.medicine?.name || '',
        quantity: m.quantity_given?.toString() || '',
        dosage: m.dose || '',
        instructions: m.notes || ''
      })));
    }
  }, [existingMedications]);

  const { data: medicines } = useQuery({
    queryKey: ['medicines'],
    queryFn: () => clinicApi.listMedicines({ limit: 1000 }),
    select: (data) => data?.medicines || []
  });

  const { data: healthProfile } = useQuery({
    queryKey: ['health-profile', formData.student_id],
    queryFn: async () => {
      if (!formData.student_id) return null;
      try {
        return await clinicApi.getHealthProfile(formData.student_id);
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!formData.student_id,
    retry: false
  });

  const createTestMutation = useMutation({
    mutationFn: (testData: any) => {
      setTests([...tests, testData]);
      return Promise.resolve(testData);
    }
  });

  // Update alerts when profile loads
  if (healthProfile && formData.student_id) {
    if (healthProfile.allergies && !studentAlerts?.allergies) {
      setStudentAlerts({
        allergies: healthProfile.allergies,
        chronic_conditions: healthProfile.chronic_conditions
      });
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      visit_date: new Date().toISOString(),
      year: year,
      term: term,
      temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
      pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
      tests: tests.map(t => ({
        test_type: t.test_type,
        test_date: new Date().toISOString(),
        result: t.result,
        reason: t.notes || '',
        notes: t.notes || ''
      })),
      medications: medications.map(m => ({
        medicine_id: m.medicine_id,
        dose: m.dosage,
        quantity_given: parseInt(m.quantity) || 0,
        notes: m.instructions || ''
      }))
    });
  };

  return (
    <div>
      {studentAlerts?.allergies && (
        <Alert type="allergy" message={`ALLERGIES: ${studentAlerts.allergies}`} />
      )}
      {studentAlerts?.chronic_conditions && (
        <Alert type="chronic" message={`CHRONIC CONDITIONS: ${studentAlerts.chronic_conditions}`} />
      )}

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs sm:text-sm font-medium mb-1">Student *</label>
            <select
              required
              value={formData.student_id}
              onChange={(e) => setFormData({...formData, student_id: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              disabled={!!initialData}
            >
              <option value="">Select student</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} - {s.admission_no}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs sm:text-sm font-medium mb-1">Symptoms *</label>
            <textarea
              required
              value={formData.symptoms}
              onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs sm:text-sm font-medium mb-1">Diagnosis</label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Temperature (°C)</label>
            <input
              type="number"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({...formData, temperature: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Blood Pressure</label>
            <input
              value={formData.blood_pressure}
              onChange={(e) => setFormData({...formData, blood_pressure: e.target.value})}
              placeholder="120/80"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Pulse</label>
            <input
              type="number"
              value={formData.pulse}
              onChange={(e) => setFormData({...formData, pulse: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Outcome *</label>
            <select
              value={formData.outcome}
              onChange={(e) => setFormData({...formData, outcome: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="returned_to_class">Returned to Class</option>
              <option value="rest_at_clinic">Rest at Clinic</option>
              <option value="rest_at_dormitory">Rest at Dormitory</option>
              <option value="sent_home">Sent Home</option>
              <option value="referred">Referred to Hospital</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        {/* Medical Tests Section */}
        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-3">Medical Tests (Optional)</h4>
          <div className="space-y-3">
            {tests.map((test, idx) => (
              <div key={idx} className="bg-purple-50 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-purple-200">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Test Type</label>
                    <select
                      value={test.test_type}
                      onChange={(e) => {
                        const newTests = [...tests];
                        newTests[idx].test_type = e.target.value;
                        setTests(newTests);
                      }}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="malaria_rdt">Malaria RDT</option>
                      <option value="pregnancy">Pregnancy Test</option>
                      <option value="blood_sugar">Blood Sugar</option>
                      <option value="hiv_test">HIV Test</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Result</label>
                    <input
                      value={test.result}
                      onChange={(e) => {
                        const newTests = [...tests];
                        newTests[idx].result = e.target.value;
                        setTests(newTests);
                      }}
                      placeholder="Positive/Negative"
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <input
                      value={test.notes || ''}
                      onChange={(e) => {
                        const newTests = [...tests];
                        newTests[idx].notes = e.target.value;
                        setTests(newTests);
                      }}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTests(tests.filter((_, i) => i !== idx))}
                  className="sm:ml-3 text-red-600 hover:text-red-800 self-end sm:self-center"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTests([...tests, { test_type: 'malaria_rdt', result: '', notes: '', student_id: formData.student_id, test_date: new Date().toISOString() }])}
              disabled={!formData.student_id}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Medical Test
            </button>
          </div>
        </div>

        {/* Medication Section */}
        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-3">Medication Given (Optional)</h4>
          <div className="space-y-3">
            {medications.map((med, idx) => (
              <div key={idx} className="bg-green-50 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-green-200">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Medicine</label>
                    <select
                      value={med.medicine_id}
                      onChange={(e) => {
                        const selectedMed = medicines?.find(m => m.id === e.target.value);
                        const newMeds = [...medications];
                        newMeds[idx] = { ...newMeds[idx], medicine_id: e.target.value, medicine_name: selectedMed?.name || '' };
                        setMedications(newMeds);
                      }}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">Select</option>
                      {medicines?.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={med.quantity}
                      onChange={(e) => {
                        const newMeds = [...medications];
                        newMeds[idx].quantity = e.target.value;
                        setMedications(newMeds);
                      }}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Dosage</label>
                    <input
                      value={med.dosage}
                      onChange={(e) => {
                        const newMeds = [...medications];
                        newMeds[idx].dosage = e.target.value;
                        setMedications(newMeds);
                      }}
                      placeholder="500mg twice daily"
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Instructions</label>
                    <input
                      value={med.instructions || ''}
                      onChange={(e) => {
                        const newMeds = [...medications];
                        newMeds[idx].instructions = e.target.value;
                        setMedications(newMeds);
                      }}
                      placeholder="After meals"
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                  className="sm:ml-3 text-red-600 hover:text-red-800 self-end sm:self-center"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMedications([...medications, { medicine_id: '', medicine_name: '', quantity: '', dosage: '', instructions: '' }])}
              disabled={!formData.student_id}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Medication
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            {initialData ? 'Update' : 'Save'} Visit
          </button>
          <button type="button" onClick={onClose} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ViewVisitModal({ visit, onClose }: { visit: any; onClose: () => void }) {
  const { data: fullVisit } = useQuery({
    queryKey: ['visit-details', visit.id],
    queryFn: () => clinicApi.getVisit(visit.id),
    enabled: !!visit.id
  });

  const { data: tests } = useQuery({
    queryKey: ['visit-tests', visit.id],
    queryFn: () => clinicApi.listTests({ visit_id: visit.id }),
    enabled: !!visit.id,
    select: (data) => data?.tests || []
  });

  const { data: medications } = useQuery({
    queryKey: ['visit-medications', visit.id],
    queryFn: () => clinicApi.getMedicationHistory({ visit_id: visit.id }),
    enabled: !!visit.id,
    select: (data) => data?.history || []
  });

  const visitData = fullVisit || visit;
  const visitTests = tests || [];
  const visitMedications = medications || [];

  const getStudentClass = (student: any) => {
    const activeEnrollment = student?.enrollments?.find((e: any) => e.status === 'active');
    return activeEnrollment?.class?.name || activeEnrollment?.class?.level || '-';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-2xl font-bold text-white">Visit Details</h2>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Patient Info */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 sm:p-5 mb-6 border-2 border-teal-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl sm:text-2xl">
                    {visitData.student?.first_name?.charAt(0)}{visitData.student?.last_name?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {visitData.student?.first_name} {visitData.student?.last_name}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs sm:text-sm text-gray-700">
                    <p><span className="font-semibold">Admission:</span> {visitData.student?.admission_no}</p>
                    <p><span className="font-semibold">Class:</span> {getStudentClass(visitData.student)}</p>
                    <p className="sm:col-span-2"><span className="font-semibold">Visit Date:</span> {new Date(visitData.visit_date).toLocaleString()}</p>
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                  <span className={`px-3 sm:px-4 py-2 inline-flex text-xs sm:text-sm font-bold rounded-full ${
                    visitData.outcome === 'returned_to_class' ? 'bg-green-100 text-green-800' :
                    visitData.outcome === 'rest_at_clinic' ? 'bg-blue-100 text-blue-800' :
                    visitData.outcome === 'rest_at_dormitory' ? 'bg-indigo-100 text-indigo-800' :
                    visitData.outcome === 'sent_home' ? 'bg-orange-100 text-orange-800' :
                    visitData.outcome === 'referred' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {visitData.outcome?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Vitals */}
            {(visitData.temperature || visitData.blood_pressure || visitData.pulse) && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">💓 Vital Signs</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {visitData.temperature && (
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">🌡️</span>
                        <div>
                          <p className="text-xs font-medium text-red-700">Temperature</p>
                          <p className="text-2xl font-bold text-red-600">{visitData.temperature}°C</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {visitData.blood_pressure && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">💓</span>
                        <div>
                          <p className="text-xs font-medium text-blue-700">Blood Pressure</p>
                          <p className="text-2xl font-bold text-blue-600">{visitData.blood_pressure}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {visitData.pulse && (
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">💗</span>
                        <div>
                          <p className="text-xs font-medium text-pink-700">Pulse Rate</p>
                          <p className="text-2xl font-bold text-pink-600">{visitData.pulse} bpm</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Clinical Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">🩺 Clinical Information</h3>
              
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center text-sm">
                  <span className="text-lg mr-2">📝</span>
                  Chief Complaint
                </h4>
                <p className="text-gray-700 text-sm">{visitData.symptoms || 'Not recorded'}</p>
              </div>

              {visitData.assessment && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center text-sm">
                    <span className="text-lg mr-2">📋</span>
                    Assessment
                  </h4>
                  <p className="text-gray-700 text-sm">{visitData.assessment}</p>
                </div>
              )}

              {visitData.diagnosis && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center text-sm">
                    <span className="text-lg mr-2">🔍</span>
                    Diagnosis
                  </h4>
                  <p className="text-gray-700 text-sm">{visitData.diagnosis}</p>
                </div>
              )}

              {visitData.treatment && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center text-sm">
                    <span className="text-lg mr-2">⚕️</span>
                    Action Taken / Treatment
                  </h4>
                  <p className="text-gray-700 text-sm">{visitData.treatment}</p>
                </div>
              )}

              {visitData.notes && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center text-sm">
                    <span className="text-lg mr-2">📝</span>
                    Additional Notes
                  </h4>
                  <p className="text-gray-700 text-sm">{visitData.notes}</p>
                </div>
              )}
            </div>

            {/* Tests & Medications */}
            {(visitTests.length > 0 || visitMedications.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {visitTests.length > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center text-sm">
                      <span className="text-lg mr-2">🧪</span>
                      Tests Performed ({visitTests.length})
                    </h4>
                    <div className="space-y-2">
                      {visitTests.map((test: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-purple-200">
                          <p className="font-bold text-purple-900 text-sm">{test.test_type?.replace(/_/g, ' ').toUpperCase()}</p>
                          <p className="text-gray-700 text-sm mt-1"><span className="font-semibold">Result:</span> {test.result}</p>
                          {test.notes && <p className="text-gray-600 text-xs mt-1">{test.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {visitMedications.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center text-sm">
                      <span className="text-lg mr-2">💊</span>
                      Medications Given ({visitMedications.length})
                    </h4>
                    <div className="space-y-2">
                      {visitMedications.map((med: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="font-bold text-green-900 text-sm">{med.medicine?.name || 'Unknown'}</p>
                          <p className="text-gray-700 text-sm mt-1">
                            <span className="font-semibold">Qty:</span> {med.quantity_given} | 
                            <span className="font-semibold"> Dose:</span> {med.dose}
                          </p>
                          {med.notes && <p className="text-gray-600 text-xs mt-1 italic">{med.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
