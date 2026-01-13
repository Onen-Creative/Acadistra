import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { clinicApi } from '@/services/api';
import type { User } from '@/types';
import Sidebar from '@/components/Sidebar';

export default function MedicalTestsPage() {
  const navigate = useNavigate();
  const user: User = JSON.parse(localStorage.getItem('user') || '{}');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: tests, isLoading } = useQuery({
    queryKey: ['medical-tests'],
    queryFn: () => clinicApi.listTests(),
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="nurse" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <nav className="bg-white shadow-xl border-b border-gray-100 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto mobile-padding py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center flex-1 min-w-0">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4 text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent truncate">
                    Medical Tests
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium truncate">Manage medical test records</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-3 py-2 rounded-xl border border-teal-100 flex-shrink-0">
                  <p className="text-xs sm:text-sm font-semibold text-teal-900 truncate max-w-32 sm:max-w-none">{user.full_name}</p>
                  <p className="text-xs text-teal-600 capitalize">{user.role?.replace('_', ' ')}</p>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-xs sm:text-sm touch-manipulation hidden lg:block"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 w-full max-w-7xl mx-auto mobile-padding py-4 sm:py-6 lg:py-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              🧪 Medical Tests
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              </div>
            ) : tests && tests.length > 0 ? (
              <div className="responsive-table rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-teal-50 to-cyan-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Test Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Result</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tests.map((test: any) => (
                      <tr key={test.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 font-medium text-gray-900">{test.student_name}</td>
                        <td className="px-6 py-4 text-gray-700">{test.test_type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            test.result === 'Positive' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {test.result}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{new Date(test.test_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🧪</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Medical Tests</h3>
                <p className="text-gray-500">No medical tests have been recorded yet</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
