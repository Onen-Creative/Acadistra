import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ConfirmDialog';
import { studentsApi, classesApi, schoolsApi, usersApi, teachersApi } from '@/services/api';
import * as XLSX from 'xlsx';
import type { User, Student } from '@/types';


import ReportCard from './ReportCard';
import BulkResultsEntry from './BulkResultsEntry';
import { useActivityDialog } from '@/hooks/useActivityDialog';
import ActivityDialog from '@/components/ActivityDialog';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import FilterBar from '@/components/FilterBar';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const getUserFromStorage = (): User => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {} as User;
    }
  };
  const user: User = getUserFromStorage();
  const { dialog, showSuccess, showError, showConfirm, closeDialog } = useActivityDialog();
  
  useWebSocket(['student:', 'class:', 'user:', 'result:', 'report:']);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const getInitialSection = () => {
    if (location.pathname === '/students') return 'students';
    if (location.pathname === '/users') return 'users';
    if (location.pathname === '/teachers') return 'teachers';
    if (location.pathname === '/results') return 'bulk';
    if (location.pathname === '/reports') return 'reports';
    return 'dashboard';
  };
  
  const [activeSection, setActiveSection] = useState<'dashboard' | 'students' | 'users' | 'teachers' | 'bulk' | 'reports'>(getInitialSection());
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const { confirm, isOpen: confirmOpen, options: confirmOptions, handleConfirm, handleClose } = useConfirm();

  useEffect(() => {
    setActiveSection(getInitialSection());
  }, [location.pathname]);

  // Dashboard summary data
  const { data: summary } = useQuery({
    queryKey: ['school-summary', term, year],
    queryFn: () => schoolsApi.getSummary({ term, year: year.toString() }),
  });

  const { data: users } = useQuery({
    queryKey: ['school-users'],
    queryFn: () => usersApi.listSchoolUsers(),
    select: (data) => Array.isArray(data) ? data : data?.users || [],
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', selectedClass, term, year, search],
    queryFn: () => {
      const params: any = { term, year, search };
      if (selectedClass !== 'all') params.class_level = selectedClass;
      return studentsApi.list(params);
    },
    select: (data) => Array.isArray(data) ? data : data?.students || [],
  });

  const { data: levels } = useQuery({
    queryKey: ['class-levels'],
    queryFn: () => classesApi.getLevels(),
  });

  const { data: userSchool } = useQuery({
    queryKey: ['school', user.school_id],
    queryFn: () => schoolsApi.get(user.school_id),
    enabled: !!user.school_id,
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teachersApi.list(),
    select: (data) => Array.isArray(data) ? data : data?.teachers || [],
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showSuccess('Student Deleted!', 'The student has been deleted successfully');
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => studentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEditingStudent(null);
      showSuccess('Student Updated!', 'The student has been updated successfully');
    },
    onError: (error: any) => {
      showError('Student Update Failed', error.response?.data?.error || error.message);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => usersApi.createSchoolUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-users'] });
      setShowAddUser(false);
      showSuccess('User Created!', 'The user has been created successfully');
    },
    onError: (error: any) => {
      showError('User Creation Failed', error.response?.data?.error || error.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.updateSchoolUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-users'] });
      setEditingUser(null);
      showSuccess('User Updated!', 'The user has been updated successfully');
    },
    onError: (error: any) => {
      showError('User Update Failed', error.response?.data?.error || error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteSchoolUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-users'] });
      showSuccess('User Deleted!', 'The user has been deleted successfully');
    },
    onError: (error: any) => {
      showError('User Deletion Failed', error.response?.data?.error || error.message);
    },
  });

  const createTeacherMutation = useMutation({
    mutationFn: teachersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setShowAddTeacher(false);
      showSuccess('Teacher Created!', 'The teacher has been created successfully');
    },
    onError: (error: any) => {
      showError('Teacher Creation Failed', error.response?.data?.error || error.message);
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => teachersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setEditingTeacher(null);
      showSuccess('Teacher Updated!', 'The teacher has been updated successfully');
    },
    onError: (error: any) => {
      showError('Teacher Update Failed', error.response?.data?.error || error.message);
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: (id: string) => teachersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      showSuccess('Teacher Deleted!', 'The teacher has been deleted successfully');
    },
    onError: (error: any) => {
      showError('Teacher Deletion Failed', error.response?.data?.error || error.message);
    },
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleDeleteStudent = (id: string) => {
    confirm(
      {
        title: 'Delete Student',
        message: 'Are you sure you want to delete this student? This will permanently remove all their records, marks, and associated data. This action cannot be undone.',
        confirmText: 'Delete Student',
        type: 'danger'
      },
      () => deleteStudentMutation.mutate(id)
    );
  };

  const handleUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      email: formData.get('email'),
      full_name: formData.get('full_name'),
      role: formData.get('role'),
    };
    if (!editingUser) {
      data.password = formData.get('password');
    }
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleDeleteUser = (id: string) => {
    confirm(
      {
        title: 'Delete User',
        message: 'Are you sure you want to delete this user? They will lose access to the system immediately. This action cannot be undone.',
        confirmText: 'Delete User',
        type: 'danger'
      },
      () => deleteUserMutation.mutate(id)
    );
  };

  const handleTeacherSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      employee_id: formData.get('employee_id'),
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      specialization: formData.get('specialization'),
      status: formData.get('status') || 'active',
    };
    if (editingTeacher) {
      updateTeacherMutation.mutate({ id: editingTeacher.id, data });
    } else {
      createTeacherMutation.mutate(data);
    }
  };

  const handleDeleteTeacher = (id: string) => {
    confirm(
      {
        title: 'Delete Teacher',
        message: 'Are you sure you want to delete this teacher? All their class assignments and records will be affected. This action cannot be undone.',
        confirmText: 'Delete Teacher',
        type: 'danger'
      },
      () => deleteTeacherMutation.mutate(id)
    );
  };

  const handleStudentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: any = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      gender: formData.get('gender'),
    };
    
    const lin = formData.get('lin');
    if (lin) {
      data.lin = lin;
    }

    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, data });
    }
  };



  const exportToExcel = () => {
    try {
      const data = students?.map((s: any) => ({
        'Admission No': s.admission_no,
        'First Name': s.first_name,
        'Last Name': s.last_name,
        'Class': s.class_name || 'N/A',
        'Gender': s.gender,
      }));
      const ws = XLSX.utils.json_to_sheet(data || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      XLSX.writeFile(wb, `students_${new Date().toISOString().split('T')[0]}.xlsx`);
      showSuccess('Export Successful!', 'Student data has been exported to Excel');
    } catch (error) {
      showError('Export Failed', 'Failed to export student data. Please try again.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="school_admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <DashboardHeader
          title="School Admin Dashboard"
          subtitle={userSchool?.name || 'Loading...'}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 pb-16 sm:pb-0">
          {(activeSection === 'dashboard' || activeSection === 'students') && (
            <div className="p-4 sm:p-6">
              <FilterBar
                term={term}
                year={year}
                search={search}
                onTermChange={setTerm}
                onYearChange={setYear}
                onSearchChange={setSearch}
                searchPlaceholder="Search students..."
              />
            </div>
          )}

      <main className="max-w-7xl mx-auto mobile-padding py-4 sm:py-6 lg:py-8">
        {activeSection === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">School Overview</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <span className="text-3xl">👨🎓</span>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{summary?.total_students || 0}</p>
                  </div>
                </div>
                <p className="text-sm font-medium opacity-90">Total Students</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <span className="text-3xl">👨🏫</span>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{summary?.total_teachers || 0}</p>
                  </div>
                </div>
                <p className="text-sm font-medium opacity-90">Teachers</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <span className="text-3xl">📚</span>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{summary?.library_summary?.total_books || 0}</p>
                  </div>
                </div>
                <p className="text-sm font-medium opacity-90">Library Books</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <span className="text-3xl">🏥</span>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{summary?.clinic_summary?.total_visits || 0}</p>
                  </div>
                </div>
                <p className="text-sm font-medium opacity-90">Clinic Visits</p>
              </div>
            </div>

            {/* Detailed Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Library Summary */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <span className="text-2xl">📚</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Library Status</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Available Books</span>
                    <span className="text-lg font-bold text-green-600">{summary?.library_summary?.available_books || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Issued Books</span>
                    <span className="text-lg font-bold text-blue-600">{summary?.library_summary?.issued_books || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Overdue Books</span>
                    <span className="text-lg font-bold text-red-600">{summary?.library_summary?.overdue_books || 0}</span>
                  </div>
                </div>
              </div>

              {/* Fees Summary */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Fees Overview</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Total Collected</span>
                    <span className="text-lg font-bold text-green-600">UGX {summary?.fees_summary?.total_fees_collected?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Outstanding</span>
                    <span className="text-lg font-bold text-red-600">UGX {summary?.fees_summary?.outstanding_fees?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Students with Fees</span>
                    <span className="text-lg font-bold text-blue-600">{summary?.fees_summary?.students_with_fees || 0}</span>
                  </div>
                </div>
              </div>

              {/* Clinic Summary */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <span className="text-2xl">🏥</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Clinic Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Malaria Tests</span>
                    <span className="text-lg font-bold text-blue-600">{summary?.clinic_summary?.malaria_tests || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Pregnancy Tests</span>
                    <span className="text-lg font-bold text-purple-600">{summary?.clinic_summary?.pregnancy_tests || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Emergencies</span>
                    <span className="text-lg font-bold text-red-600">{summary?.clinic_summary?.emergencies || 0}</span>
                  </div>
                </div>
              </div>

              {/* Users by Role */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Staff Distribution</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(summary?.users_by_role || {}).map(([role, count]) => (
                    <div key={role} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 font-medium capitalize">{role.replace('_', ' ')}</span>
                      <span className="text-lg font-bold text-blue-600">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'users' && (
          <div>
            <div className="flex flex-col gap-4 mb-6 sm:mb-8">
              <div className="flex-1 min-w-0">
                <h2 className="mobile-heading font-bold text-gradient flex items-center gap-2">
                  👥 User Management
                </h2>
                <p className="text-gray-600 mt-1 font-medium mobile-text">Manage staff at your school</p>
              </div>
              <button 
                onClick={() => setShowAddUser(true)} 
                className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
              >
                ➕ <span>Add User</span>
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="responsive-table">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-green-50 to-teal-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(users || []).map((user: any) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="font-semibold text-gray-900 text-sm">{user.full_name}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="text-gray-600 text-sm">{user.email}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold capitalize">
                            {user.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex gap-2">
                            <button onClick={() => setEditingUser(user)} className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors duration-150 touch-manipulation">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="bg-red-100 text-red-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors duration-150 touch-manipulation">
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
          </div>
        )}

        {activeSection === 'teachers' && (
          <div>
            <div className="flex flex-col gap-4 mb-6 sm:mb-8">
              <div className="flex-1 min-w-0">
                <h2 className="mobile-heading font-bold text-gradient flex items-center gap-2">
                  👨‍🏫 Teacher Management
                </h2>
                <p className="text-gray-600 mt-1 font-medium mobile-text">Manage teaching staff at your school</p>
              </div>
              <button 
                onClick={() => setShowAddTeacher(true)} 
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
              >
                ➕ <span>Add Teacher</span>
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="responsive-table">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Teacher</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contact</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Specialization</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(teachers || []).map((teacher: any) => (
                      <tr key={teacher.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div>
                            <span className="font-semibold text-gray-900 text-sm">
                              {teacher.first_name} {teacher.last_name}
                            </span>
                            <p className="text-xs text-gray-500">ID: {teacher.employee_id}</p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div>
                            <span className="text-gray-600 text-sm">{teacher.email}</span>
                            <p className="text-xs text-gray-500">{teacher.phone}</p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="text-gray-600 text-sm">{teacher.specialization || 'N/A'}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                            teacher.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {teacher.status || 'active'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex gap-2">
                            <button onClick={() => setEditingTeacher(teacher)} className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors duration-150 touch-manipulation">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteTeacher(teacher.id)} className="bg-red-100 text-red-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors duration-150 touch-manipulation">
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
          </div>
        )}

        {activeSection === 'students' && (
          <div>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex-1">
                <h2 className="mobile-heading font-bold text-gradient">👥 Students</h2>
                <p className="text-gray-600 mt-1 font-medium mobile-text">Manage student records</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)} 
                  className="input-field font-medium"
                >
                  <option value="all">All Classes</option>
                  {levels?.map((level: any) => (
                    <option key={level.level} value={level.level}>{level.level}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={exportToExcel} 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
                >
                  📄 <span className="hidden sm:inline">Export Excel</span><span className="sm:hidden">Export</span>
                </button>
                <button 
                  onClick={() => navigate('/register-student')} 
                  className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
                >
                  ➕ <span className="hidden sm:inline">Register Student</span><span className="sm:hidden">Register</span>
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-48 sm:h-64">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-green-600"></div>
              </div>
            ) : students?.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
                <div className="text-4xl sm:text-6xl mb-4">🎓</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No students found</h3>
                <p className="text-gray-500 text-sm sm:text-base">No students match the selected filters</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-green-50 to-teal-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Admission No</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Full Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Gender</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Class</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Term/Year</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(students || []).slice((currentPage - 1) * studentsPerPage, currentPage * studentsPerPage).map((student: any) => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-semibold text-gray-900 text-sm">{student.admission_no}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}
                            </div>
                            {student.lin && (
                              <div className="text-xs text-gray-500">LIN: {student.lin}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              student.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {student.gender}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                              {student.class_name || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {term} / {year}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => navigate(`/students/${student.id}`)} 
                                className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors"
                              >
                                View
                              </button>
                              <button 
                                onClick={() => setEditingStudent(student)} 
                                className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteStudent(student.id)} 
                                className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
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
                {students && students.length > studentsPerPage && (
                  <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, students.length)} of {students.length} students
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 bg-green-500 text-white rounded-lg">
                        {currentPage} of {Math.ceil((students || []).length / studentsPerPage)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil((students || []).length / studentsPerPage)))}
                        disabled={currentPage === Math.ceil((students || []).length / studentsPerPage)}
                        className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === 'bulk' && (
          <BulkResultsEntry />
        )}

        {activeSection === 'reports' && (
          <ReportCard students={students || []} />
        )}
      </main>

      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col mx-4">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-800">Edit Student</h3>
            </div>
            <form id="studentForm" onSubmit={handleStudentSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 sm:space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e0 #f7fafc' }}>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Admission Number</label>
                <input value={editingStudent.admission_no} disabled className="input-field bg-gray-100 text-gray-600" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                <input name="first_name" defaultValue={editingStudent?.first_name} required className="input-field" placeholder="Enter first name" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                <input name="last_name" defaultValue={editingStudent?.last_name} required className="input-field" placeholder="Enter last name" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">LIN (Learner Identification Number)</label>
                <input name="lin" defaultValue={editingStudent?.lin} className="input-field" placeholder="Enter LIN (optional)" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Gender *</label>
                <select name="gender" defaultValue={editingStudent?.gender} required className="input-field">
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </form>
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex gap-2 sm:gap-3 safe-area-bottom">
              <button type="submit" form="studentForm" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg text-sm sm:text-base touch-manipulation">
                Update
              </button>
              <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold hover:bg-gray-300 transition text-sm sm:text-base touch-manipulation">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Navigation */}
      <div className="mobile-nav lg:hidden">
        <div className="flex justify-around overflow-x-auto">
          <button onClick={() => { setActiveSection('dashboard'); navigate('/dashboard'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition touch-manipulation ${activeSection === 'dashboard' ? 'text-green-600 bg-green-50' : 'text-gray-600'}`}>
            <span className="text-lg mb-1">📊</span>
            <span className="text-xs font-medium">Dashboard</span>
          </button>
          <button onClick={() => { setActiveSection('students'); navigate('/students'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition touch-manipulation ${activeSection === 'students' ? 'text-green-600 bg-green-50' : 'text-gray-600'}`}>
            <span className="text-lg mb-1">👥</span>
            <span className="text-xs font-medium">Students</span>
          </button>
          <button onClick={() => { setActiveSection('users'); navigate('/users'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition touch-manipulation ${activeSection === 'users' ? 'text-green-600 bg-green-50' : 'text-gray-600'}`}>
            <span className="text-lg mb-1">👤</span>
            <span className="text-xs font-medium">Users</span>
          </button>
          <button onClick={() => { setActiveSection('teachers'); navigate('/teachers'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition touch-manipulation ${activeSection === 'teachers' ? 'text-green-600 bg-green-50' : 'text-gray-600'}`}>
            <span className="text-lg mb-1">👨🏫</span>
            <span className="text-xs font-medium">Teachers</span>
          </button>
          <button onClick={() => { setActiveSection('bulk'); navigate('/results'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition touch-manipulation ${activeSection === 'bulk' ? 'text-green-600 bg-green-50' : 'text-gray-600'}`}>
            <span className="text-lg mb-1">📝</span>
            <span className="text-xs font-medium">Bulk Entry</span>
          </button>
          <button onClick={() => { setActiveSection('reports'); navigate('/reports'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition touch-manipulation ${activeSection === 'reports' ? 'text-green-600 bg-green-50' : 'text-gray-600'}`}>
            <span className="text-lg mb-1">📋</span>
            <span className="text-xs font-medium">Reports</span>
          </button>
        </div>
      </div>
      
      {(showAddUser || editingUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col mx-4">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-800">{editingUser ? 'Edit User' : 'Add New User'}</h3>
            </div>
            <form id="userForm" onSubmit={handleUserSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input name="full_name" defaultValue={editingUser?.full_name} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Enter full name" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="user@example.com" />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Password *</label>
                  <input name="password" type="password" required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Min 8 characters" />
                </div>
              )}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Role *</label>
                <select name="role" defaultValue={editingUser?.role} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition">
                  <option value="">Select role</option>
                  <option value="teacher">Teacher</option>
                  <option value="bursar">Bursar</option>
                  <option value="librarian">Librarian</option>
                  <option value="nurse">Nurse</option>
                </select>
              </div>
            </form>
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex gap-2 sm:gap-3">
              <button type="submit" form="userForm" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg text-sm sm:text-base touch-manipulation">
                {editingUser ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowAddUser(false); setEditingUser(null); }} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold hover:bg-gray-300 transition text-sm sm:text-base touch-manipulation">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {(showAddTeacher || editingTeacher) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-800">{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h3>
            </div>
            <form id="teacherForm" onSubmit={handleTeacherSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Employee ID *</label>
                  <input name="employee_id" defaultValue={editingTeacher?.employee_id} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                  <input name="first_name" defaultValue={editingTeacher?.first_name} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                  <input name="last_name" defaultValue={editingTeacher?.last_name} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <input name="email" type="email" defaultValue={editingTeacher?.email} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                  <input name="phone" defaultValue={editingTeacher?.phone} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Specialization</label>
                  <input name="specialization" defaultValue={editingTeacher?.specialization} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                </div>
              </div>
            </form>
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex gap-2 sm:gap-3">
              <button type="submit" form="teacherForm" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-700 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-800 transition shadow-md hover:shadow-lg text-sm sm:text-base touch-manipulation">
                {editingTeacher ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowAddTeacher(false); setEditingTeacher(null); }} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold hover:bg-gray-300 transition text-sm sm:text-base touch-manipulation">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
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
      </div>
    </div>
  );
}
