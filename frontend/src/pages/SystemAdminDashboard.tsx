import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { schoolsApi, usersApi, auditApi } from '@/services/api';
import type { User } from '@/types';
import NotificationAlert from '@/components/NotificationAlert';
import { useActivityDialog } from '@/hooks/useActivityDialog';
import ActivityDialog from '@/components/ActivityDialog';
import Sidebar from '@/components/Sidebar';
import Pagination from '@/components/Pagination';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function SystemAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user: User = JSON.parse(localStorage.getItem('user') || '{}');
  
  useWebSocket(['school:', 'user:', 'audit:']);
  const { dialog, showSuccess, showError, showConfirm, closeDialog } = useActivityDialog();
  
  // Determine active section from URL
  const getInitialSection = () => {
    if (location.pathname === '/schools') return 'schools';
    if (location.pathname === '/admins') return 'admins';
    return 'dashboard';
  };
  
  const [activeSection, setActiveSection] = useState<'dashboard' | 'schools' | 'admins'>(getInitialSection());
  const [showEditSchool, setShowEditSchool] = useState(false);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [schoolType, setSchoolType] = useState<string>('Nursery');
  const [schoolLogo, setSchoolLogo] = useState<File | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schoolsPage, setSchoolsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [schoolsSearch, setSchoolsSearch] = useState('');
  const [usersSearch, setUsersSearch] = useState('');

  // Update section when URL changes
  useEffect(() => {
    setActiveSection(getInitialSection());
  }, [location.pathname]);

  const levelsByType: Record<string, string[]> = {
    Nursery: ['Baby', 'Middle', 'Top'],
    Primary: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    Secondary: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  };

  const { data: schools, isLoading: loadingSchools } = useQuery({
    queryKey: ['schools', schoolsPage, schoolsSearch],
    queryFn: () => schoolsApi.list({ page: schoolsPage, limit: 9, search: schoolsSearch }),
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', usersPage, usersSearch],
    queryFn: () => usersApi.list({ page: usersPage, limit: 10, search: usersSearch }),
    enabled: activeSection === 'admins',
    select: (data) => ({
      users: data?.users?.filter((u: any) => u.role === 'school_admin') || [],
      total: data?.total || 0,
      page: data?.page || 1,
      limit: data?.limit || 10,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => schoolsApi.getStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => auditApi.getRecentActivity(10),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Auto-refresh data when mutations complete
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);



  const createSchoolMutation = useMutation({
    mutationFn: (data: any) => schoolsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      setShowAddSchool(false);
      showSuccess('School Created!', 'The school has been created successfully');
    },
  });

  const updateSchoolMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => schoolsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      setShowEditSchool(false);
      setEditingSchool(null);
      showSuccess('School Updated!', 'The school has been updated successfully');
    },
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: (id: string) => schoolsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      showSuccess('School Deleted!', 'The school has been deleted successfully');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      setShowAddUser(false);
      showSuccess('User Created!', 'The user has been created successfully');
    },
    onError: (error: any) => {
      console.error('User creation error:', error.response?.data || error.message);
      showError('User Creation Failed', error.response?.data?.error || error.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      setEditingUser(null);
      showSuccess('User Updated!', 'The user has been updated successfully');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      showSuccess('User Deleted!', 'The user has been deleted successfully');
    },
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleSchoolSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const levels = Array.from(formData.getAll('levels')) as string[];
    
    let logoUrl = editingSchool?.logo_url || '';
    if (schoolLogo) {
      const uploadFormData = new FormData();
      uploadFormData.append('logo', schoolLogo);
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8080/api/v1/upload/logo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData,
      });
      const result = await response.json();
      logoUrl = 'http://localhost:8080' + result.url;
    }
    
    const data: any = {
      name: formData.get('name'),
      type: formData.get('type'),
      address: formData.get('address'),
      country: formData.get('country') || 'Uganda',
      region: formData.get('region') || '',
      contact_email: formData.get('contact_email'),
      phone: formData.get('phone'),
      logo_url: logoUrl,
      motto: formData.get('motto'),
      config: { levels },
      levels: levels, // Send levels separately for backend processing
    };
    
    if (editingSchool) {
      await updateSchoolMutation.mutateAsync({ id: editingSchool.id, data });
    } else {
      await createSchoolMutation.mutateAsync(data);
    }
    queryClient.invalidateQueries({ queryKey: ['classes'] });
  };

  const handleUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const schoolId = formData.get('school_id') as string;
    const data: any = {
      email: formData.get('email'),
      full_name: formData.get('full_name'),
      role: formData.get('role'),
    };
    if (schoolId && schoolId !== '') {
      data.school_id = schoolId;
    }
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
    showConfirm(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      () => deleteUserMutation.mutate(id),
      'Delete',
      'Cancel'
    );
  };

  const handleDeleteSchool = (id: string) => {
    showConfirm(
      'Delete School',
      'Are you sure you want to delete this school? This will also delete all associated data and cannot be undone.',
      () => deleteSchoolMutation.mutate(id),
      'Delete',
      'Cancel'
    );
  };



  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="system_admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64">
      <nav className="bg-white shadow-lg border-b border-gray-200 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-4 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">System Admin Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Manage schools and users</p>
              </div>
            </div>
            <NotificationAlert />
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Hero Stats Grid */}
            {stats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-5xl">🏫</div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium opacity-90 mb-2">Total Schools</h3>
                    <p className="text-4xl font-bold mb-4">{stats.total_schools}</p>
                    <div className="space-y-1.5 pt-3 border-t border-white/20">
                      {Object.entries(stats.schools_by_type).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center text-sm">
                          <span className="opacity-90">{type}</span>
                          <span className="font-semibold bg-white/20 px-2 py-0.5 rounded-full">{String(count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-5xl">👨‍💼</div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium opacity-90 mb-2">School Admins</h3>
                    <p className="text-4xl font-bold mb-4">{stats.users_by_role?.school_admin || 0}</p>
                    <div className="pt-3 border-t border-white/20">
                      <div className="flex justify-between items-center text-sm">
                        <span className="opacity-90">Total Users</span>
                        <span className="font-semibold bg-white/20 px-2 py-0.5 rounded-full">{stats.total_users || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-5xl">👨‍🎓</div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium opacity-90 mb-2">Total Students</h3>
                    <p className="text-4xl font-bold mb-4">{stats.total_students}</p>
                    <div className="pt-3 border-t border-white/20">
                      <div className="flex justify-between items-center text-sm">
                        <span className="opacity-90">Active Enrollments</span>
                        <span className="font-semibold bg-white/20 px-2 py-0.5 rounded-full">{stats.total_students}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-5xl">📊</div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium opacity-90 mb-2">System Health</h3>
                    <p className="text-4xl font-bold mb-4">{stats.health?.uptime_percent?.toFixed(1) || 0}%</p>
                    <div className="pt-3 border-t border-white/20">
                      <div className="flex justify-between items-center text-sm">
                        <span className="opacity-90">{stats.health?.database || 'Database'}</span>
                        <span className="font-semibold bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            stats.health?.status === 'healthy' ? 'bg-green-300' : 'bg-red-300'
                          }`}></div>
                          {stats.health?.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-rose-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Teachers</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.users_by_role?.teacher || 0}</p>
                      </div>
                      <div className="text-4xl">👨‍🏫</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-cyan-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Librarians</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.users_by_role?.librarian || 0}</p>
                      </div>
                      <div className="text-4xl">📚</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-pink-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Nurses</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.users_by_role?.nurse || 0}</p>
                      </div>
                      <div className="text-4xl">⚕️</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    Recent Activity
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                  </h3>
                  <span className="text-sm text-white/80">Live Updates</span>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentActivity?.length > 0 ? (
                    recentActivity.map((activity: any, index: number) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border border-gray-200">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.action === 'CREATE' ? 'bg-green-100 text-green-600' :
                          activity.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' :
                          activity.action === 'DELETE' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {activity.action === 'CREATE' ? '✨' :
                           activity.action === 'UPDATE' ? '✏️' :
                           activity.action === 'DELETE' ? '🗑️' : '📝'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              activity.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                              activity.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                              activity.action === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {activity.action}
                            </span>
                            <span className="text-sm font-semibold text-gray-700">{activity.resource_type}</span>
                          </div>
                          {(activity.after?.name || activity.before?.name) && (
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              📝 {activity.after?.name || activity.before?.name}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              👤 {activity.user_name || 'Unknown User'}
                            </span>
                            {activity.school_name && (
                              <span className="flex items-center gap-1">
                                🏫 {activity.school_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              🕒 {new Date(activity.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📊</div>
                      <p className="text-gray-500 font-medium">No recent activity</p>
                      <p className="text-sm text-gray-400 mt-2">Activity will appear here as users interact with the system</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'schools' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Schools</h2>
                <p className="text-gray-600 mt-1">Manage all schools in the system</p>
              </div>
              <button onClick={() => setShowAddSchool(true)} className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition shadow-md hover:shadow-lg flex items-center gap-2">
                <span className="text-xl">+</span> Add School
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search schools..."
                value={schoolsSearch}
                onChange={(e) => { setSchoolsSearch(e.target.value); setSchoolsPage(1); }}
                className="w-full max-w-md border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            {loadingSchools ? (
              <div className="flex items-center justify-center h-48 sm:h-64">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {schools?.schools?.map((school: any) => (
                    <div key={school.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2"></div>
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{school.name}</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">{school.type}</span>
                          </div>
                          {school.logo_url && (
                            <img src={school.logo_url} alt="Logo" className="h-12 w-12 object-contain border rounded ml-4" />
                          )}
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p><span className="font-semibold">📍</span> {school.address || 'No address'}</p>
                          <p><span className="font-semibold">✉️</span> {school.contact_email || 'No email'}</p>
                          <p><span className="font-semibold">📞</span> {school.phone || 'No phone'}</p>
                          {school.motto && <p className="italic">"<span className="font-semibold">🎯</span> {school.motto}"</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingSchool(school); setSchoolType(school.type); setShowEditSchool(true); }} className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200 transition">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteSchool(school.id)} className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {schools?.total > 0 && (
                  <Pagination
                    currentPage={schoolsPage}
                    totalPages={Math.ceil(schools.total / (schools.limit || 9))}
                    onPageChange={setSchoolsPage}
                  />
                )}
              </>
            )}
          </div>
        )}

        {activeSection === 'admins' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">School Admins</h2>
                <p className="text-gray-600 mt-1">Manage school administrators</p>
              </div>
              <button onClick={() => setShowAddUser(true)} className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition shadow-md hover:shadow-lg flex items-center gap-2">
                <span className="text-xl">+</span> Add School Admin
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={usersSearch}
                onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1); }}
                className="w-full max-w-md border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            {loadingUsers ? (
              <div className="flex items-center justify-center h-48 sm:h-64">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">School</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users?.users?.map((u: any) => (
                          <tr key={u.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{u.full_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                              {u.school?.name || 'No school assigned'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button onClick={() => setEditingUser(u)} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-200 transition">
                                  Edit
                                </button>
                                <button onClick={() => handleDeleteUser(u.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-200 transition">
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
                {users?.total > 0 && (
                  <Pagination
                    currentPage={usersPage}
                    totalPages={Math.ceil(users.total / (users.limit || 10))}
                    onPageChange={setUsersPage}
                  />
                )}
              </>
            )}
          </div>
        )}
        </div>
      </main>
      </div>

      {(showAddSchool || showEditSchool) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800">{editingSchool ? 'Edit School' : 'Add New School'}</h3>
            </div>
            <form id="schoolForm" onSubmit={handleSchoolSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">School Name *</label>
                <input name="name" defaultValue={editingSchool?.name} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Enter school name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">School Type *</label>
                <select name="type" defaultValue={editingSchool?.type || 'Primary'} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" onChange={(e) => setSchoolType(e.target.value)}>
                  <option value="Nursery">Nursery</option>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Levels * (select one or more)</label>
                <div className="space-y-2 border-2 border-gray-300 rounded-lg px-4 py-3 max-h-40 overflow-y-auto bg-gray-50">
                  {levelsByType[schoolType]?.map(level => (
                    <label key={level} className="flex items-center hover:bg-white px-2 py-1 rounded cursor-pointer transition">
                      <input 
                        type="checkbox" 
                        name="levels" 
                        value={level} 
                        defaultChecked={editingSchool?.config?.levels?.includes(level)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" 
                      />
                      <span className="ml-3 text-gray-700">{level}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Classes and subjects will be automatically created for selected levels</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea name="address" defaultValue={editingSchool?.address} rows={3} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-none" placeholder="Enter school address" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input name="contact_email" defaultValue={editingSchool?.contact_email} type="email" className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="school@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                <input name="phone" defaultValue={editingSchool?.phone} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="+256 XXX XXX XXX" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">School Motto</label>
                <input name="motto" defaultValue={editingSchool?.motto} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Enter school motto" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">School Logo</label>
                <input type="file" accept="image/*" onChange={(e) => setSchoolLogo(e.target.files?.[0] || null)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                {editingSchool?.logo_url && <img src={editingSchool.logo_url} alt="Current logo" className="mt-2 h-16 w-16 object-contain border rounded" />}
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button type="submit" form="schoolForm" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg">
                {editingSchool ? 'Update School' : 'Create School'}
              </button>
              <button type="button" onClick={() => { setShowEditSchool(false); setShowAddSchool(false); setEditingSchool(null); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(showAddUser || editingUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800">{editingUser ? 'Edit User' : 'Add New User'}</h3>
            </div>
            <form id="userForm" onSubmit={handleUserSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input name="full_name" defaultValue={editingUser?.full_name} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Enter full name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="user@example.com" />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                  <input name="password" type="password" required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Min 8 characters" />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role *</label>
                <select name="role" defaultValue={editingUser?.role} required className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition">
                  <option value="school_admin">School Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">School *</label>
                <select name="school_id" defaultValue={editingUser?.school_id} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition">
                  <option value="">Select school</option>
                  {schools?.schools?.map((school: any) => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button type="submit" form="userForm" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg">
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              <button type="button" onClick={() => { setShowAddUser(false); setEditingUser(null); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
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
    </div>
  );
}
