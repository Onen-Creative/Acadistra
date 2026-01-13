import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { clinicApi } from '@/services/api';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';

export default function HealthProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['health-profile-detail', id],
    queryFn: () => clinicApi.getHealthProfileById(id!),
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Error Loading Profile</h3>
          <p className="text-red-600 mb-4">{(error as any)?.message || 'Failed to load health profile'}</p>
          <button
            onClick={() => navigate('/clinic/health-profiles')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Profile Not Found</h3>
          <p className="text-gray-500 mb-4">The health profile you're looking for doesn't exist</p>
          <button
            onClick={() => navigate('/clinic/health-profiles')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold">📋 Health Profile Details</h1>
            </div>
            <button onClick={() => navigate('/clinic/health-profiles')} className="text-gray-600 hover:text-gray-900">
              ← Back
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Student Info Card */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white mb-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold">
                    {profile?.student?.first_name?.charAt(0)}{profile?.student?.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {profile?.student?.first_name} {profile?.student?.last_name}
                  </h2>
                  <p className="text-teal-100">Admission No: {profile?.student?.admission_no}</p>
                  <p className="text-teal-100">Term {profile?.term} / {profile?.year}</p>
                </div>
              </div>
            </div>

            {/* Health Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Blood Group */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <span className="text-2xl">🩸</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Blood Group</h3>
                </div>
                <p className="text-3xl font-bold text-red-600">{profile?.blood_group || 'Not specified'}</p>
              </div>

              {/* Emergency Contact */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <span className="text-2xl">📞</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Emergency Contact</h3>
                </div>
                <p className="text-gray-700 font-medium">{profile?.emergency_contact || 'Not specified'}</p>
                <p className="text-gray-600 text-sm mt-1">{profile?.emergency_phone || ''}</p>
              </div>

              {/* Allergies */}
              <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-yellow-100 p-2 rounded-lg">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Allergies</h3>
                </div>
                {profile?.allergies ? (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <p className="text-red-800 font-medium">{profile.allergies}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No known allergies</p>
                )}
              </div>

              {/* Chronic Conditions */}
              <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <span className="text-2xl">💊</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Chronic Conditions</h3>
                </div>
                {profile?.chronic_conditions ? (
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                    <p className="text-purple-800 font-medium">{profile.chronic_conditions}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No chronic conditions recorded</p>
                )}
              </div>

              {/* Disabilities */}
              <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <span className="text-2xl">♿</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Special Needs & Disabilities</h3>
                </div>
                {profile?.disabilities ? (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-blue-800 font-medium">{profile.disabilities}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No special needs or disabilities recorded</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => navigate(`/clinic/health-profiles`)}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={() => navigate('/clinic/health-profiles')}
                className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
