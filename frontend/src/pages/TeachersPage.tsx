import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActivityDialog } from '@/hooks/useActivityDialog';
import ActivityDialog from '@/components/ActivityDialog';
import DashboardHeader from '@/components/DashboardHeader';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import Sidebar from '@/components/Sidebar';
import { useWebSocket } from '@/hooks/useWebSocket';
import { teachersApi } from '@/services/api';

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const { dialog, showSuccess, showError, closeDialog } = useActivityDialog();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [viewingTeacher, setViewingTeacher] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useWebSocket(['teacher:']);

  const { data: teachersData, isLoading } = useQuery({
    queryKey: ['teachers', searchTerm, statusFilter, page, limit],
    queryFn: () => teachersApi.list({ 
      search: searchTerm, 
      page,
      limit
    }),
  });

  const createTeacherMutation = useMutation({
    mutationFn: async (teacherData: any) => {
      console.log('Sending teacher data:', teacherData);
      try {
        const result = await teachersApi.create(teacherData);
        console.log('Teacher created:', result);
        return result;
      } catch (error: any) {
        console.error('Teacher creation error:', error.response?.data || error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      showSuccess('Success!', 'Teacher added successfully');
      setShowAddTeacher(false);
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      showError('Error!', error.response?.data?.error || 'Failed to add teacher');
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => teachersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      showSuccess('Success!', 'Teacher updated successfully');
      setEditingTeacher(null);
    },
    onError: () => showError('Error!', 'Failed to update teacher'),
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: teachersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      showSuccess('Success!', 'Teacher deleted successfully');
    },
    onError: () => showError('Error!', 'Failed to delete teacher'),
  });

  const handleTeacherSubmit = (data: any) => {
    if (editingTeacher) {
      updateTeacherMutation.mutate({ id: editingTeacher.id, data });
    } else {
      createTeacherMutation.mutate(data);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="school_admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <DashboardHeader
          title="Teachers Management"
          subtitle="Manage school teaching staff"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-auto p-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search teachers by name, employee ID, or email..."
                className="flex-1"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowAddTeacher(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg text-sm"
              >
                ➕ Add Teacher
              </button>
            </div>
          </div>

          {/* Teachers List */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Teacher</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Contact</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Specialization</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(teachersData?.teachers || []).map((teacher: any) => (
                        <tr key={teacher.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {teacher.first_name} {teacher.last_name}
                              </p>
                              <p className="text-sm text-gray-500">ID: {teacher.employee_id}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm text-gray-900">{teacher.email}</p>
                              <p className="text-sm text-gray-500">{teacher.phone}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{teacher.specialization}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              teacher.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {teacher.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => setViewingTeacher(teacher)}
                                className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-200"
                              >
                                View
                              </button>
                              <button
                                onClick={() => setEditingTeacher(teacher)}
                                className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTeacherMutation.mutate(teacher.id)}
                                className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs hover:bg-red-200"
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

                {/* Pagination */}
                {teachersData && (
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil((teachersData.total || 0) / limit)}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* View Teacher Modal */}
      <Modal
        isOpen={!!viewingTeacher}
        onClose={() => setViewingTeacher(null)}
        title="Teacher Details"
        size="lg"
      >
        {viewingTeacher && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><strong>Employee ID:</strong> {viewingTeacher.employee_id}</div>
              <div><strong>Name:</strong> {viewingTeacher.first_name} {viewingTeacher.middle_name} {viewingTeacher.last_name}</div>
              <div><strong>Email:</strong> {viewingTeacher.email}</div>
              <div><strong>Phone:</strong> {viewingTeacher.phone}</div>
              <div><strong>Gender:</strong> {viewingTeacher.gender || 'N/A'}</div>
              <div><strong>Date of Birth:</strong> {viewingTeacher.date_of_birth ? new Date(viewingTeacher.date_of_birth).toLocaleDateString() : 'N/A'}</div>
              <div><strong>National ID:</strong> {viewingTeacher.national_id || 'N/A'}</div>
              <div><strong>Specialization:</strong> {viewingTeacher.specialization || 'N/A'}</div>
              <div><strong>Experience:</strong> {viewingTeacher.experience} years</div>
              <div><strong>Employment Type:</strong> {viewingTeacher.employment_type}</div>
              <div><strong>Status:</strong> {viewingTeacher.status}</div>
              <div><strong>Salary:</strong> {viewingTeacher.salary ? `UGX ${viewingTeacher.salary.toLocaleString()}` : 'N/A'}</div>
            </div>
            {viewingTeacher.address && (
              <div><strong>Address:</strong> {viewingTeacher.address}</div>
            )}
            {viewingTeacher.qualifications && (
              <div><strong>Qualifications:</strong> {viewingTeacher.qualifications}</div>
            )}
            <div className="pt-4">
              <button 
                onClick={() => setViewingTeacher(null)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Teacher Modal */}
      <Modal
        isOpen={showAddTeacher || !!editingTeacher}
        onClose={() => { setShowAddTeacher(false); setEditingTeacher(null); }}
        title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
        size="lg"
      >
        <TeacherForm
          teacher={editingTeacher}
          onSubmit={handleTeacherSubmit}
          onCancel={() => { setShowAddTeacher(false); setEditingTeacher(null); }}
        />
      </Modal>

      <ActivityDialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
      />
    </div>
  );
}

function TeacherForm({ teacher, onSubmit, onCancel }: {
  teacher?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      employee_id: formData.get('employee_id') as string,
      first_name: formData.get('first_name') as string,
      middle_name: formData.get('middle_name') as string || '',
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      gender: formData.get('gender') as string || '',
      date_of_birth: formData.get('date_of_birth') ? formData.get('date_of_birth') + 'T00:00:00Z' : null,
      national_id: formData.get('national_id') as string || '',
      address: formData.get('address') as string || '',
      qualifications: formData.get('qualifications') as string || '',
      specialization: formData.get('specialization') as string || '',
      experience: parseInt(formData.get('experience') as string) || 0,
      employment_type: formData.get('employment_type') as string || 'Permanent',
      salary: parseFloat(formData.get('salary') as string) || 0,
      status: 'active',
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Employee ID *</label>
          <input 
            name="employee_id" 
            defaultValue={teacher?.employee_id} 
            required 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">First Name *</label>
          <input 
            name="first_name" 
            defaultValue={teacher?.first_name} 
            required 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Middle Name</label>
          <input 
            name="middle_name" 
            defaultValue={teacher?.middle_name} 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Last Name *</label>
          <input 
            name="last_name" 
            defaultValue={teacher?.last_name} 
            required 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email *</label>
          <input 
            name="email" 
            type="email"
            defaultValue={teacher?.email} 
            required 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Phone *</label>
          <input 
            name="phone" 
            defaultValue={teacher?.phone} 
            required 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Gender</label>
          <select 
            name="gender" 
            defaultValue={teacher?.gender} 
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Date of Birth</label>
          <input 
            name="date_of_birth" 
            type="date"
            defaultValue={teacher?.date_of_birth} 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">National ID</label>
          <input 
            name="national_id" 
            defaultValue={teacher?.national_id} 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Specialization</label>
          <input 
            name="specialization" 
            defaultValue={teacher?.specialization} 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Experience (Years)</label>
          <input 
            name="experience" 
            type="number"
            min="0"
            defaultValue={teacher?.experience} 
            className="w-full border rounded-lg px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Employment Type</label>
          <select 
            name="employment_type" 
            defaultValue={teacher?.employment_type || 'Permanent'} 
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="Permanent">Permanent</option>
            <option value="Contract">Contract</option>
            <option value="Part-time">Part-time</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Address</label>
        <textarea 
          name="address" 
          defaultValue={teacher?.address} 
          rows={2}
          className="w-full border rounded-lg px-3 py-2" 
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Qualifications</label>
        <textarea 
          name="qualifications" 
          defaultValue={teacher?.qualifications} 
          rows={3}
          className="w-full border rounded-lg px-3 py-2" 
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <button 
          type="submit" 
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          {teacher ? 'Update' : 'Add'} Teacher
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}