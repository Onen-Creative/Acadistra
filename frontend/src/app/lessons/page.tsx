'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function LessonMonitoringPage() {
  const { user } = useRequireAuth(['school_admin']);
  const [lessons, setLessons] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    teacher_id: '',
    lesson_date: new Date().toISOString().split('T')[0],
    lesson_time: '',
    duration_minutes: 40,
    topic: '',
    sub_topic: '',
    status: 'completed',
    reason_missed: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchLessons();
      fetchClasses();
      fetchSubjects();
      fetchTeachers();
      fetchStats();
    }
  }, [user, filterClass, filterStatus]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClass) params.append('class_id', filterClass);
      if (filterStatus) params.append('status', filterStatus);
      const response = await api.get(`/lessons?${params}`);
      setLessons(response.data.lessons || []);
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/v1/classes');
      setClasses(response.data || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/lessons/subjects');
      setSubjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/api/v1/staff', { params: { role: 'Teacher' } });
      const teachersData = Array.isArray(response.data) ? response.data : response.data.staff || [];
      const transformedTeachers = teachersData.map((t: any) => ({
        ...t,
        full_name: `${t.first_name} ${t.middle_name ? t.middle_name + ' ' : ''}${t.last_name}`.trim()
      }));
      setTeachers(transformedTeachers);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/lessons/stats?period=today');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Saving lesson...');
    try {
      await api.post('/lessons', formData);
      toast.success('✅ Lesson recorded successfully!', { id: loadingToast });
      setShowModal(false);
      setFormData({ class_id: '', subject_id: '', teacher_id: '', lesson_date: new Date().toISOString().split('T')[0], lesson_time: '', duration_minutes: 40, topic: '', sub_topic: '', status: 'completed', reason_missed: '', notes: '' });
      fetchLessons();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save lesson', { id: loadingToast });
    }
  };

  const exportReport = async (period: string) => {
    const loadingToast = toast.loading('Generating report...');
    try {
      const response = await api.get(`/lessons/export?period=${period}`);
      const lessons = Array.isArray(response.data.lessons) ? response.data.lessons : [];
      const data = lessons.map((l: any, i: number) => ({
        '#': i + 1,
        'Date': new Date(l.lesson_date).toLocaleDateString(),
        'Time': l.lesson_time,
        'Class': l.class?.name || '',
        'Subject': l.subject?.name || '',
        'Teacher': l.teacher?.full_name || '',
        'Topic': l.topic,
        'Sub-Topic': l.sub_topic || '',
        'Duration (min)': l.duration_minutes,
        'Status': l.status,
        'Reason Missed': l.reason_missed || '',
        'Notes': l.notes || ''
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Lessons');
      XLSX.writeFile(wb, `lessons_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('📊 Report exported!', { id: loadingToast });
    } catch (error: any) {
      toast.error('Failed to export report', { id: loadingToast });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Lesson Monitoring</h1>
              <p className="text-blue-100">Track daily lessons, topics, and missed classes</p>
            </div>
            <button onClick={() => setShowModal(true)} className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium shadow-lg">+ Record Lesson</button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-sm text-gray-500">Today's Lessons</p>
              <p className="text-2xl font-bold">{stats.total_lessons}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed_lessons}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-sm text-gray-500">Missed</p>
              <p className="text-2xl font-bold text-red-600">{stats.missed_lessons}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-4 gap-4">
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="border rounded-lg px-3 py-2">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2">
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
            <button onClick={() => { setFilterClass(''); setFilterStatus(''); }} className="bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Clear</button>
            <select onChange={(e) => e.target.value && exportReport(e.target.value)} className="border rounded-lg px-3 py-2 bg-green-500 text-white font-medium">
              <option value="">📊 Export Report</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lessons.length > 0 ? lessons.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{new Date(lesson.lesson_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">{lesson.lesson_time}</td>
                    <td className="px-6 py-4 text-sm">{lesson.class?.name}</td>
                    <td className="px-6 py-4 text-sm">{lesson.subject?.name}</td>
                    <td className="px-6 py-4 text-sm">{lesson.teacher ? `${lesson.teacher.first_name} ${lesson.teacher.last_name}` : ''}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium">{lesson.topic}</div>
                      {lesson.sub_topic && <div className="text-xs text-gray-500">{lesson.sub_topic}</div>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${lesson.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{lesson.status}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No lessons recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Record Lesson</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Class *</label>
                    <select value={formData.class_id} onChange={(e) => setFormData({...formData, class_id: e.target.value})} required className="w-full border rounded-lg px-3 py-2">
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject *</label>
                    <select value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})} required className="w-full border rounded-lg px-3 py-2">
                      <option value="">Select subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Teacher *</label>
                    <select value={formData.teacher_id} onChange={(e) => setFormData({...formData, teacher_id: e.target.value})} required className="w-full border rounded-lg px-3 py-2">
                      <option value="">Select teacher</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date *</label>
                    <input type="date" value={formData.lesson_date} onChange={(e) => setFormData({...formData, lesson_date: e.target.value})} required className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Time *</label>
                    <input type="time" value={formData.lesson_time} onChange={(e) => setFormData({...formData, lesson_time: e.target.value})} required className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                    <input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Topic *</label>
                  <input type="text" value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sub-Topic</label>
                  <input type="text" value={formData.sub_topic} onChange={(e) => setFormData({...formData, sub_topic: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status *</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} required className="w-full border rounded-lg px-3 py-2">
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
                {formData.status === 'missed' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason for Missing</label>
                    <textarea value={formData.reason_missed} onChange={(e) => setFormData({...formData, reason_missed: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">Save Lesson</button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
