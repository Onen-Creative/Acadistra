import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicApi, studentsApi, classesApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ConfirmDialog';
import Sidebar from '@/components/Sidebar';

export default function HealthProfilesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const limit = 20;
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose } = useConfirm();

  const { data: studentsData, isLoading, error } = useQuery({
    queryKey: ['students', classFilter, term, year],
    queryFn: () => {
      const params: any = { term, year, limit: 1000 };
      if (classFilter) params.class_level = classFilter;
      return studentsApi.list(params);
    },
    select: (data) => Array.isArray(data) ? data : data?.students || [],
    retry: 1
  });

  const { data: healthProfiles } = useQuery({
    queryKey: ['all-health-profiles', term, year],
    queryFn: async () => {
      // Fetch health profiles for all students
      const profiles: any = {};
      if (studentsData) {
        for (const student of studentsData) {
          try {
            const profile = await clinicApi.getHealthProfile(student.id);
            profiles[student.id] = profile;
          } catch (e) {
            // Student has no profile
          }
        }
      }
      return profiles;
    },
    enabled: !!studentsData && studentsData.length > 0
  });

  // Merge health profiles with students
  const students = studentsData?.map((student: any) => ({
    ...student,
    health_profile: healthProfiles?.[student.id]
  })) || [];

  const { data: classes } = useQuery({
    queryKey: ['classes', term, year],
    queryFn: () => classesApi.list({ term, year }),
    staleTime: 5 * 60 * 1000
  });

  // Get unique class levels
  const uniqueLevels = [...new Set((classes?.classes || classes || []).map((c: any) => c.level))].filter(Boolean);

  const { data: profile } = useQuery({
    queryKey: ['health-profile', selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return null;
      try {
        return await clinicApi.getHealthProfile(selectedStudent);
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!selectedStudent,
    retry: false
  });

  const createMutation = useMutation({
    mutationFn: clinicApi.createHealthProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-profile'] });
      queryClient.invalidateQueries({ queryKey: ['all-health-profiles'] });
      setShowForm(false);
      setSelectedStudent('');
      toast.success('✅ Health profile created successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to create profile: ${error.response?.data?.error || error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clinicApi.updateHealthProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-profile'] });
      queryClient.invalidateQueries({ queryKey: ['all-health-profiles'] });
      setShowForm(false);
      setSelectedStudent('');
      toast.success('✅ Health profile updated successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to update profile: ${error.response?.data?.error || error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clinicApi.deleteHealthProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-profile'] });
      queryClient.invalidateQueries({ queryKey: ['all-health-profiles'] });
      toast.success('🗑️ Health profile deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to delete profile: ${error.response?.data?.error || error.message}`);
    }
  });

  const filteredStudents = students || [];

  const searchFilteredStudents = filteredStudents.filter((s: any) => {
    if (!search) return true;
    return s.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_no?.toLowerCase().includes(search.toLowerCase());
  });

  const paginatedStudents = searchFilteredStudents.slice((page - 1) * limit, page * limit);

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
              <h1 className="text-xl font-bold">📋 Student Health Profiles</h1>
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
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border rounded-lg px-4 py-2"
            />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="">All Classes</option>
              {uniqueLevels.map((level: string) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {selectedStudent && !profile && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">No health profile found for this student.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Create Health Profile
              </button>
            </div>
          )}

          {showForm && (
            <ProfileForm
              studentId={selectedStudent}
              profile={profile}
              onClose={() => setShowForm(false)}
              onSubmit={(data) => {
                if (profile) {
                  updateMutation.mutate({ id: profile.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
            />
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading students...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Error Loading Students</h3>
                <p className="text-red-600">{(error as any)?.message || 'Failed to load students'}</p>
              </div>
            ) : paginatedStudents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">👨‍🎓</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Found</h3>
                <p className="text-gray-500">No students match the selected filters</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blood Group</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allergies</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chronic Conditions</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedStudents.map((student: any) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {student.first_name} {student.last_name}
                        <div className="text-xs text-gray-500">{student.admission_no}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{student.class_level || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {student.health_profile?.blood_group || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {student.health_profile?.allergies ? (
                          <span className="text-red-600">{student.health_profile.allergies}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {student.health_profile?.chronic_conditions ? (
                          <span className="text-purple-600">{student.health_profile.chronic_conditions}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {student.health_profile ? (
                            <>
                              <button
                                onClick={() => navigate(`/clinic/health-profiles/${student.health_profile.id}`)}
                                className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs hover:bg-purple-200 font-medium"
                              >
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStudent(student.id);
                                  setShowForm(true);
                                }}
                                className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => confirm(
                                  {
                                    title: 'Delete Health Profile',
                                    message: 'Are you sure you want to delete this health profile? This will permanently remove all health information for this student.',
                                    confirmText: 'Delete Profile',
                                    type: 'danger'
                                  },
                                  () => deleteMutation.mutate(student.health_profile.id)
                                )}
                                className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs hover:bg-red-200 font-medium"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedStudent(student.id);
                                setShowForm(true);
                              }}
                              className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs hover:bg-green-200 font-medium"
                            >
                              Create
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
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
            <span className="px-4 py-2">Page {page} of {Math.ceil(searchFilteredStudents.length / limit) || 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(searchFilteredStudents.length / limit)}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </main>
      </div>

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

function ProfileForm({ studentId, profile, onClose, onSubmit }: { studentId: string; profile?: any; onClose: () => void; onSubmit: (data: any) => void }) {
  const [term, setTerm] = useState(profile?.term || 'Term1');
  const [year, setYear] = useState(profile?.year || new Date().getFullYear());
  const [formData, setFormData] = useState({
    student_id: studentId,
    blood_group: '',
    allergies: '',
    chronic_conditions: '',
    disabilities: '',
    emergency_contact: '',
    emergency_phone: ''
  });

  const { data: healthData } = useQuery({
    queryKey: ['student-health-data', studentId],
    queryFn: () => clinicApi.getStudentHealthData(studentId),
    enabled: !!studentId && !profile
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        student_id: studentId,
        blood_group: profile.blood_group || '',
        allergies: profile.allergies || '',
        chronic_conditions: profile.chronic_conditions || '',
        disabilities: profile.disabilities || '',
        emergency_contact: profile.emergency_contact || '',
        emergency_phone: profile.emergency_phone || ''
      });
    } else if (healthData) {
      setFormData(prev => ({
        ...prev,
        disabilities: [healthData.special_needs, healthData.disability_status].filter(Boolean).join('; ') || '',
        emergency_contact: healthData.emergency_contact && healthData.emergency_phone 
          ? `${healthData.emergency_contact} (${healthData.emergency_phone})`
          : healthData.emergency_contact || ''
      }));
    }
  }, [healthData, profile, studentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, year, term });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">{profile ? 'Edit' : 'Create'} Health Profile</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Blood Group</label>
            <select
              value={formData.blood_group}
              onChange={(e) => setFormData({...formData, blood_group: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Emergency Contact (Name & Phone)</label>
            <input
              value={formData.emergency_contact}
              onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              placeholder="Auto-filled from guardian"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Allergies (Food, Drug)</label>
            <textarea
              value={formData.allergies}
              onChange={(e) => setFormData({...formData, allergies: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="List any known allergies..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Chronic Conditions</label>
            <textarea
              value={formData.chronic_conditions}
              onChange={(e) => setFormData({...formData, chronic_conditions: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Asthma, epilepsy, diabetes, etc."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Special Needs & Disabilities</label>
            <textarea
              value={formData.disabilities}
              onChange={(e) => setFormData({...formData, disabilities: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              rows={2}
              placeholder="Auto-filled from student registration"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Save Profile
          </button>
          <button type="button" onClick={onClose} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
