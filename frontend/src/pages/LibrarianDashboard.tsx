import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { libraryApi } from '@/services/api';
import DashboardHeader from '@/components/DashboardHeader';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTermYearFilter } from '@/hooks/useTermYearFilter';
import TermYearFilter from '@/components/TermYearFilter';

export default function LibrarianDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { term, year, setTerm, setYear } = useTermYearFilter();

  useWebSocket(['library:']);

  const { data: stats } = useQuery({
    queryKey: ['library-stats', term, year],
    queryFn: () => libraryApi.getStats({ term, year }),
  });

  const { data: subjectStats } = useQuery({
    queryKey: ['library-stats-subjects', term, year],
    queryFn: () => libraryApi.getStatsBySubject({ term, year }),
  });



  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="librarian" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <DashboardHeader
          title="Library Dashboard"
          subtitle="School Library Management System"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-auto p-6">
          {/* Term/Year Filter */}
          <div className="mb-6">
            <TermYearFilter
              term={term}
              year={year}
              onTermChange={setTerm}
              onYearChange={setYear}
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Books</p>
                  <p className="text-3xl font-bold mt-1">{stats?.total_books || 0}</p>
                </div>
                <div className="text-blue-200 text-2xl">📚</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Available</p>
                  <p className="text-3xl font-bold mt-1">{stats?.available_books || 0}</p>
                </div>
                <div className="text-green-200 text-2xl">✅</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Issued</p>
                  <p className="text-3xl font-bold mt-1">{stats?.active_issues || 0}</p>
                </div>
                <div className="text-orange-200 text-2xl">📤</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Overdue</p>
                  <p className="text-3xl font-bold mt-1">{stats?.overdue_books || 0}</p>
                </div>
                <div className="text-red-200 text-2xl">⚠️</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => navigate('/library/books')}
              className="bg-white rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-200 border border-gray-100 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3">📚</span>
                    <h3 className="text-xl font-semibold text-gray-900">Manage Books</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">Add, edit, and organize your library collection by class and subject</p>
                </div>
                <div className="text-gray-400 group-hover:text-purple-600 transition-colors text-xl ml-4">→</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/library/issues')}
              className="bg-white rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-200 border border-gray-100 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3">📋</span>
                    <h3 className="text-xl font-semibold text-gray-900">Book Issues</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">Issue books to students and teachers, manage returns and track overdue items</p>
                </div>
                <div className="text-gray-400 group-hover:text-purple-600 transition-colors text-xl ml-4">→</div>
              </div>
            </button>
          </div>

          {/* Library Statistics by Subject */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="mr-3">📊</span>
                Library Statistics by Subject
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Available</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Issued</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Overdue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjectStats?.stats?.length > 0 ? subjectStats.stats.map((stat: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{stat.subject}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{stat.total_books}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {stat.available_books}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {stat.issued_books}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {stat.overdue || 0}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No subject statistics available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40 sm:hidden">
        <div className="flex justify-around">
          <button
            onClick={() => navigate('/library/books')}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition text-gray-600 hover:text-purple-600 hover:bg-purple-50"
          >
            <span className="text-lg mb-1">📚</span>
            <span className="text-xs font-medium">Books</span>
          </button>
          <button
            onClick={() => navigate('/library/issues')}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition text-gray-600 hover:text-purple-600 hover:bg-purple-50"
          >
            <span className="text-lg mb-1">📋</span>
            <span className="text-xs font-medium">Issues</span>
          </button>
        </div>
      </div>
    </div>
  );
}