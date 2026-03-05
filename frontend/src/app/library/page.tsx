'use client';

import { useState, useEffect } from 'react';
import { libraryApi } from '@/services/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';

export default function LibraryDashboard() {
  const { user } = useRequireAuth(['librarian', 'school_admin']);
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, issuesRes] = await Promise.all([
        libraryApi.getStats(),
        libraryApi.listIssues({ limit: 10 })
      ]);
      setStats(statsRes);
      setRecentIssues(issuesRes.issues || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-4 md:p-8 text-white">
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-2">Library Dashboard</h1>
            <p className="text-sm md:text-base text-purple-100">Manage your school library efficiently</p>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs md:text-sm font-medium">Total Books</p>
                <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats?.total_books || 0}</p>
              </div>
              <div className="bg-white/20 p-2 md:p-4 rounded-lg">
                <span className="text-xl md:text-3xl">📚</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs md:text-sm font-medium">Available</p>
                <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats?.available_books || 0}</p>
              </div>
              <div className="bg-white/20 p-2 md:p-4 rounded-lg">
                <span className="text-xl md:text-3xl">✅</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs md:text-sm font-medium">Issued</p>
                <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats?.active_issues || 0}</p>
              </div>
              <div className="bg-white/20 p-2 md:p-4 rounded-lg">
                <span className="text-xl md:text-3xl">📤</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs md:text-sm font-medium">Overdue</p>
                <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats?.overdue_books || 0}</p>
              </div>
              <div className="bg-white/20 p-2 md:p-4 rounded-lg">
                <span className="text-xl md:text-3xl">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentIssues.length > 0 ? recentIssues.map((issue) => (
                <div key={issue.id} className="py-3 border-b last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{issue.book_title}</p>
                      <p className="text-xs text-gray-600 mt-1">Copy: {issue.copy_number}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {issue.borrower_name} {issue.borrower_class && `- ${issue.borrower_class}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(issue.issued_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                      issue.status === 'issued' ? 'bg-blue-100 text-blue-800' : 
                      issue.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button onClick={() => router.push('/library/issues')} className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                <div className="text-xl md:text-2xl mb-1 md:mb-2">📤</div>
                <div className="text-xs md:text-sm font-medium">Issue Book</div>
              </button>
              <button onClick={() => router.push('/library/issues')} className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                <div className="text-xl md:text-2xl mb-1 md:mb-2">📥</div>
                <div className="text-xs md:text-sm font-medium">Return Book</div>
              </button>
              <button onClick={() => router.push('/library/books')} className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                <div className="text-xl md:text-2xl mb-1 md:mb-2">📚</div>
                <div className="text-xs md:text-sm font-medium">Manage Books</div>
              </button>
              <button onClick={() => router.push('/library/books')} className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                <div className="text-xl md:text-2xl mb-1 md:mb-2">➕</div>
                <div className="text-xs md:text-sm font-medium">Add Book</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}