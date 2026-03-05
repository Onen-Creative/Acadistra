'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { clinicApi, studentsApi, classesApi } from '@/services/api';
import toast from 'react-hot-toast';

export default function HealthProfilesPage() {
  const { user } = useRequireAuth(['nurse', 'school_admin']);
  const [students, setStudents] = useState<any[]>([]);
  const [healthProfiles, setHealthProfiles] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [viewingProfile, setViewingProfile] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) fetchClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClass) fetchStudents();
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await classesApi.list();
      setClasses(response.classes || response || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentsApi.list({ class_id: selectedClass, limit: 1000 });
      const studentsList = response.students || [];
      setStudents(studentsList);
      
      const profiles: any = {};
      for (const student of studentsList) {
        try {
          const profile = await clinicApi.getHealthProfile(student.id);
          profiles[student.id] = profile;
        } catch (e) {}
      }
      setHealthProfiles(profiles);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!confirm('Delete this health profile?')) return;
    const loadingToast = toast.loading('Deleting...');
    try {
      await clinicApi.deleteHealthProfile(profileId);
      toast.success('Profile deleted!', { id: loadingToast });
      fetchStudents();
    } catch (error) {
      toast.error('Failed to delete', { id: loadingToast });
    }
  };

  const uniqueLevels = [...new Set(classes.map((c: any) => c.level))].filter(Boolean);
  const filteredClasses = selectedLevel ? classes.filter((c: any) => c.level === selectedLevel) : [];

  const filteredStudents = students.filter((s: any) => {
    if (!search) return true;
    return s.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_no?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">📋 Student Health Profiles</h1>
          <p className="text-purple-100">Manage comprehensive health records for students</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded-lg px-4 py-2"
          />
          <select
            value={selectedLevel}
            onChange={(e) => { setSelectedLevel(e.target.value); setSelectedClass(''); }}
            className="border rounded-lg px-4 py-2"
          >
            <option value="">Select Level</option>
            {uniqueLevels.map((level: string) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border rounded-lg px-4 py-2"
            disabled={!selectedLevel}
          >
            <option value="">Select Class</option>
            {filteredClasses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : !selectedClass ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Class</h3>
            <p className="text-gray-500">Please select a level and class to view student health profiles</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blood Group</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allergies</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chronic Conditions</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student: any) => {
                  const profile = healthProfiles[student.id];
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
                        <div className="text-xs text-gray-500">{student.admission_no}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{profile?.blood_group || '-'}</td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {profile?.allergies ? (
                          <span className="text-red-600">{profile.allergies}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {profile?.chronic_conditions ? (
                          <span className="text-purple-600">{profile.chronic_conditions}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {profile ? (
                            <>
                              <button
                                onClick={() => setViewingProfile({ ...student, profile })}
                                className="bg-teal-500 text-white px-2 py-1 rounded text-xs hover:bg-teal-600"
                              >
                                View
                              </button>
                              <button
                                onClick={() => { setSelectedStudent({ ...student, profile }); setShowModal(true); }}
                                className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(profile.id)}
                                className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => { setSelectedStudent(student); setShowModal(true); }}
                              className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                            >
                              Create
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <ProfileModal
            student={selectedStudent}
            onClose={() => { setShowModal(false); setSelectedStudent(null); }}
            onSuccess={() => { setShowModal(false); setSelectedStudent(null); fetchStudents(); }}
          />
        )}

        {viewingProfile && (
          <ViewModal profile={viewingProfile} onClose={() => setViewingProfile(null)} />
        )}
      </div>
    </DashboardLayout>
  );
}

function ProfileModal({ student, onClose, onSuccess }: any) {
  const primaryGuardian = student.guardians?.[0];
  const [formData, setFormData] = useState({
    student_id: student.id,
    blood_group: student.profile?.blood_group || '',
    allergies: student.profile?.allergies || '',
    chronic_conditions: student.profile?.chronic_conditions || '',
    disabilities: student.profile?.disabilities || student.special_needs || '',
    emergency_contact: student.profile?.emergency_contact || primaryGuardian?.full_name || '',
    emergency_phone: student.profile?.emergency_phone || primaryGuardian?.phone || '',
    year: new Date().getFullYear(),
    term: 'Term1'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(student.profile ? 'Updating...' : 'Creating...');
    try {
      if (student.profile) {
        await clinicApi.updateHealthProfile(student.profile.id, formData);
        toast.success('Profile updated!', { id: loadingToast });
      } else {
        await clinicApi.createHealthProfile(formData);
        toast.success('Profile created!', { id: loadingToast });
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed', { id: loadingToast });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">{student.profile ? 'Edit' : 'Create'} Health Profile</h3>
        <p className="text-sm text-gray-600 mb-4">
          Student: {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-1">Emergency Phone</label>
              <input
                value={formData.emergency_phone}
                onChange={(e) => setFormData({...formData, emergency_phone: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Emergency Contact Name</label>
            <input
              value={formData.emergency_contact}
              onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Allergies</label>
            <textarea
              value={formData.allergies}
              onChange={(e) => setFormData({...formData, allergies: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Food, drug allergies..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chronic Conditions</label>
            <textarea
              value={formData.chronic_conditions}
              onChange={(e) => setFormData({...formData, chronic_conditions: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Asthma, diabetes, epilepsy..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Disabilities / Special Needs</label>
            <textarea
              value={formData.disabilities}
              onChange={(e) => setFormData({...formData, disabilities: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">
              {student.profile ? 'Update' : 'Create'} Profile
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewModal({ profile, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-purple-600">Health Profile Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
        </div>
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="font-bold text-lg">
              {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
            </p>
            <p className="text-sm text-gray-600">{profile.admission_no}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Blood Group</p>
              <p className="font-bold text-red-700">{profile.profile?.blood_group || 'Not set'}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Emergency Contact</p>
              <p className="font-bold text-blue-700">{profile.profile?.emergency_contact || 'Not set'}</p>
              <p className="text-xs text-blue-600">{profile.profile?.emergency_phone || ''}</p>
            </div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-gray-700">Allergies</p>
              <p className="text-gray-600">{profile.profile?.allergies || 'None recorded'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Chronic Conditions</p>
              <p className="text-gray-600">{profile.profile?.chronic_conditions || 'None recorded'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Disabilities / Special Needs</p>
              <p className="text-gray-600">{profile.profile?.disabilities || 'None recorded'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
