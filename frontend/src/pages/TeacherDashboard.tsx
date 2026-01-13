import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { schoolsApi, resultsApi, studentsApi, classesApi, subjectsApi } from '@/services/api';
import type { User } from '@/types';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import FilterBar from '@/components/FilterBar';
import { useActivityDialog } from '@/hooks/useActivityDialog';
import ActivityDialog from '@/components/ActivityDialog';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user: User = JSON.parse(localStorage.getItem('user') || '{}');
  
  useWebSocket(['result:', 'student:', 'class:']);
  const { dialog, showSuccess, showError, closeDialog } = useActivityDialog();
  
  const getInitialSection = () => {
    if (location.pathname === '/view-marks') return 'view';
    if (location.pathname === '/enter-marks') return 'entry';
    return 'dashboard';
  };
  
  const [activeSection, setActiveSection] = useState<'dashboard' | 'entry' | 'view'>(getInitialSection());
  const [globalTerm, setGlobalTerm] = useState('Term1');
  const [globalYear, setGlobalYear] = useState(2026);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState('Term1');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [viewClass, setViewClass] = useState<string>('');
  const [viewStudent, setViewStudent] = useState<string>('');
  const [viewTerm, setViewTerm] = useState('Term1');
  const [viewYear, setViewYear] = useState(2026);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [marks, setMarks] = useState<Record<string, { ca: string; exam: string; total: number; grade: string }>>({});

  // Calculate grade based on total
  const calculateGrade = (total: number): string => {
    if (total >= 80) return 'A';
    if (total >= 65) return 'B';
    if (total >= 50) return 'C';
    if (total >= 35) return 'D';
    return 'E';
  };

  useEffect(() => {
    setActiveSection(getInitialSection());
  }, [location.pathname]);

  const { data: levels } = useQuery({
    queryKey: ['class-levels'],
    queryFn: () => classesApi.getLevels(),
  });

  const { data: allStudents } = useQuery({
    queryKey: ['all-students-no-filter'],
    queryFn: () => studentsApi.list({}),
    select: (data) => Array.isArray(data) ? data : data?.students || [],
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', selectedClass],
    queryFn: () => subjectsApi.list({ level: selectedClass }),
    enabled: !!selectedClass,
  });

  const { data: classStudents } = useQuery({
    queryKey: ['class-students', selectedClass, selectedTerm, selectedYear],
    queryFn: () => studentsApi.list({ class_level: selectedClass, term: selectedTerm, year: String(selectedYear), limit: 100 }),
    enabled: !!selectedClass,
    select: (data) => Array.isArray(data) ? data : data?.students || [],
  });

  // Get results for all students in the class for the selected subject
  const { data: classResults } = useQuery({
    queryKey: ['class-results', selectedClass, selectedSubject, selectedTerm, selectedYear],
    queryFn: async () => {
      if (!selectedClass || !selectedSubject || !classStudents) return [];
      const results = await Promise.all(
        classStudents.map((s: any) => 
          resultsApi.getByStudent(s.id, { term: selectedTerm, year: String(selectedYear) })
            .then(res => ({ studentId: s.id, results: res }))
            .catch(() => ({ studentId: s.id, results: [] }))
        )
      );
      return results;
    },
    enabled: !!selectedClass && !!selectedSubject && !!classStudents,
  });

  const { data: viewStudents } = useQuery({
    queryKey: ['students', viewClass, viewTerm, viewYear],
    queryFn: () => studentsApi.list({ class_level: viewClass, term: viewTerm, year: String(viewYear) }),
    enabled: !!viewClass,
    select: (data) => Array.isArray(data) ? data : data?.students || [],
  });

  const { data: userSchool } = useQuery({
    queryKey: ['school', user.school_id],
    queryFn: () => schoolsApi.get(user.school_id),
    enabled: !!user.school_id,
  });

  const { data: results } = useQuery({
    queryKey: ['results', viewStudent, viewTerm, viewYear],
    queryFn: () => resultsApi.getByStudent(viewStudent, { term: viewTerm, year: String(viewYear) }),
    enabled: !!viewStudent,
  });

  // Get students with their marks status
  const studentsWithMarksStatus = classStudents?.map((student: any) => {
    const studentResults = classResults?.find((cr: any) => cr.studentId === student.id);
    const existingMark = studentResults?.results?.find((r: any) => 
      r.subject_id === selectedSubject
    );
    return {
      ...student,
      existingMark,
      hasMarks: !!existingMark,
    };
  }) || [];

  const createResultMutation = useMutation({
    mutationFn: (data: any) => resultsApi.createOrUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-students'] });
      showSuccess('Marks Saved!', 'Student marks have been saved successfully');
    },
    onError: (error: any) => {
      showError('Save Failed', error.response?.data?.error || error.message);
    },
  });

  // Calculate class statistics
  const getClassStats = () => {
    if (!levels) return [];
    
    return levels.map((level: any) => {
      const classStudents = allStudents?.filter((s: any) => s.class_level === level.level) || [];
      const males = classStudents.filter((s: any) => s.gender === 'Male').length;
      const females = classStudents.filter((s: any) => s.gender === 'Female').length;
      
      return {
        level: level.level,
        total: classStudents.length,
        males,
        females,
      };
    });
  };

  const classStats = getClassStats();

  const handleMarkChange = (studentId: string, field: 'ca' | 'exam', value: string) => {
    setMarks(prev => {
      const current = prev[studentId] || { ca: '', exam: '', total: 0, grade: '' };
      const updated = { ...current, [field]: value };
      
      // Calculate total and grade
      const ca = parseFloat(updated.ca) || 0;
      const exam = parseFloat(updated.exam) || 0;
      const total = ca + exam;
      const grade = calculateGrade(total);
      
      return {
        ...prev,
        [studentId]: { ...updated, total, grade },
      };
    });
  };

  const handleSubmitMarks = async () => {
    if (!selectedSubject || !selectedClass) return;

    const entries = Object.entries(marks).filter(([_, m]) => m.ca || m.exam);
    if (entries.length === 0) {
      showError('No Marks', 'Please enter marks for at least one student');
      return;
    }

    for (const [studentId, mark] of entries) {
      await createResultMutation.mutateAsync({
        student_id: studentId,
        subject_id: selectedSubject,
        term: selectedTerm,
        year: selectedYear,
        raw_marks: {
          ca: mark.ca ? parseFloat(mark.ca) : 0,
          exam: mark.exam ? parseFloat(mark.exam) : 0,
        },
      });
    }

    setMarks({});
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="teacher" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64">
        <DashboardHeader
          title="Teacher Dashboard"
          subtitle={userSchool?.name || 'Loading...'}
          onMenuClick={() => setSidebarOpen(true)}
        />

      <main className="flex-1 w-full max-w-7xl mx-auto mobile-padding py-4 sm:py-6 lg:py-8 overflow-auto">
        {activeSection === 'dashboard' && (
          <FilterBar
            term={globalTerm}
            year={globalYear}
            search={search}
            onTermChange={setGlobalTerm}
            onYearChange={setGlobalYear}
            onSearchChange={setSearch}
            searchPlaceholder="Search..."
          />
        )}
        
        {activeSection === 'dashboard' && (
          <div className="w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Class Overview</h2>
            
            {/* Class Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {classStats.map((stat: any) => (
                <div key={stat.level} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-200">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 sm:p-4">
                    <h3 className="text-lg sm:text-xl font-bold text-white">{stat.level}</h3>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between p-2 sm:p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl">👨🎓</span>
                          <span className="text-sm sm:text-base font-semibold text-gray-700">Total</span>
                        </div>
                        <span className="text-xl sm:text-2xl font-bold text-blue-600">{stat.total}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 sm:p-3 bg-cyan-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl">👨</span>
                          <span className="text-sm sm:text-base font-semibold text-gray-700">Male</span>
                        </div>
                        <span className="text-lg sm:text-xl font-bold text-cyan-600">{stat.males}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 sm:p-3 bg-pink-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl">👩</span>
                          <span className="text-sm sm:text-base font-semibold text-gray-700">Female</span>
                        </div>
                        <span className="text-lg sm:text-xl font-bold text-pink-600">{stat.females}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(!classStats || classStats.length === 0) && (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <div className="text-6xl mb-4">🏫</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Classes Yet</h3>
                <p className="text-gray-500">No students have been enrolled in any classes</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'entry' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              ✍️ Enter Marks
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Class *</label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field">
                  <option value="">Select Class</option>
                  {levels?.map((level: any) => <option key={level.level} value={level.level}>{level.level}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="input-field" disabled={!selectedClass}>
                  <option value="">Select Subject</option>
                  {subjects?.map((subject: any) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Term *</label>
                <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="input-field">
                  <option>Term1</option>
                  <option>Term2</option>
                  <option>Term3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Year *</label>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="input-field" />
              </div>
            </div>

            {selectedClass && selectedSubject && studentsWithMarksStatus.length > 0 && (
              <div>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Students with existing marks are shown as read-only (gray background). Only school admin can edit existing marks.
                  </p>
                </div>
                <div className="responsive-table rounded-xl border border-gray-200 mb-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Admission No</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Student Name</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">CA (20)</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Exam (80)</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Total</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentsWithMarksStatus.map((student: any) => (
                        <tr key={student.id} className={student.hasMarks ? 'bg-gray-100' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 font-medium text-gray-900">{student.admission_no}</td>
                          <td className="px-6 py-4 text-gray-900">{student.first_name} {student.last_name}</td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={student.hasMarks ? student.existingMark?.raw_marks?.ca || '' : marks[student.id]?.ca || ''}
                              onChange={(e) => handleMarkChange(student.id, 'ca', e.target.value)}
                              disabled={student.hasMarks}
                              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-200 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              min="0"
                              max="80"
                              value={student.hasMarks ? student.existingMark?.raw_marks?.exam || '' : marks[student.id]?.exam || ''}
                              onChange={(e) => handleMarkChange(student.id, 'exam', e.target.value)}
                              disabled={student.hasMarks}
                              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-200 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-4 text-center font-semibold text-gray-900">
                            {student.hasMarks 
                              ? student.existingMark?.raw_marks?.total || '—' 
                              : marks[student.id]?.total || '—'
                            }
                          </td>
                          <td className="px-6 py-4 text-center">
                            {student.hasMarks ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                student.existingMark?.final_grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                student.existingMark?.final_grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                student.existingMark?.final_grade === 'C' ? 'bg-amber-100 text-amber-700' :
                                student.existingMark?.final_grade === 'D' ? 'bg-orange-100 text-orange-700' :
                                student.existingMark?.final_grade === 'E' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {student.existingMark?.final_grade || '—'}
                              </span>
                            ) : marks[student.id]?.grade ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                marks[student.id]?.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                marks[student.id]?.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                marks[student.id]?.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                                marks[student.id]?.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                                marks[student.id]?.grade === 'E' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {marks[student.id]?.grade}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {studentsWithMarksStatus.some((s: any) => !s.hasMarks) && (
                  <button
                    onClick={handleSubmitMarks}
                    disabled={createResultMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createResultMutation.isPending ? 'Saving...' : 'Save Marks'}
                  </button>
                )}
              </div>
            )}



            {selectedClass && selectedSubject && (!classStudents || classStudents.length === 0) && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👨🎓</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Found</h3>
                <p className="text-gray-500">No students enrolled in {selectedClass} for {selectedTerm} {selectedYear}</p>
                <p className="text-sm text-gray-400 mt-2">Make sure students have active enrollments for this class, term, and year</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'view' && (
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <h2 className="mobile-heading font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
              📈 View Student Marks
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Class</label>
                <select 
                  value={viewClass} 
                  onChange={(e) => setViewClass(e.target.value)} 
                  className="input-field"
                >
                  <option value="">Select Class</option>
                  {levels?.map((level: any) => <option key={level.level} value={level.level}>{level.level}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Student</label>
                <select 
                  value={viewStudent} 
                  onChange={(e) => setViewStudent(e.target.value)} 
                  className="input-field disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={!viewClass}
                >
                  <option value="">Select Student</option>
                  {viewStudents?.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Term</label>
                <select 
                  value={viewTerm} 
                  onChange={(e) => setViewTerm(e.target.value)} 
                  className="input-field"
                >
                  <option>Term1</option>
                  <option>Term2</option>
                  <option>Term3</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Year</label>
                <input 
                  type="number" 
                  value={viewYear} 
                  onChange={(e) => setViewYear(Number(e.target.value))} 
                  className="input-field" 
                />
              </div>
            </div>
            {viewStudent && (
              <div className="responsive-table rounded-xl border border-gray-200">
                {results && results.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Subject</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">CA</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Exam</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((result: any) => (
                        <tr key={result.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-gray-900 text-sm">{result.subject_name}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-center text-gray-700 text-sm">{result.raw_marks?.ca || '—'}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-center text-gray-700 text-sm">{result.raw_marks?.exam || '—'}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-center font-semibold text-gray-900 text-sm">{result.raw_marks?.total || '—'}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                              result.final_grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                              result.final_grade === 'B' ? 'bg-blue-100 text-blue-700' :
                              result.final_grade === 'C' ? 'bg-amber-100 text-amber-700' :
                              result.final_grade === 'D' ? 'bg-orange-100 text-orange-700' :
                              result.final_grade === 'E' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {result.final_grade || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <div className="text-4xl sm:text-6xl mb-4">📄</div>
                    <p className="text-gray-500 text-base sm:text-lg">No marks found for this student</p>
                    <p className="text-gray-400 text-xs sm:text-sm">{viewTerm} {viewYear}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      </div>
      
      {/* Mobile Navigation */}
      <div className="mobile-nav">
        <div className="flex justify-around">
          <button onClick={() => { setActiveSection('dashboard'); navigate('/dashboard'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition touch-manipulation ${activeSection === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>
            <span className="text-lg mb-1">📊</span>
            <span className="text-xs font-medium">Dashboard</span>
          </button>
          <button onClick={() => { setActiveSection('view'); navigate('/view-marks'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition touch-manipulation ${activeSection === 'view' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>
            <span className="text-lg mb-1">👁️</span>
            <span className="text-xs font-medium">View</span>
          </button>
          <button onClick={() => { setActiveSection('entry'); navigate('/enter-marks'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition touch-manipulation ${activeSection === 'entry' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>
            <span className="text-lg mb-1">✍️</span>
            <span className="text-xs font-medium">Enter</span>
          </button>
        </div>
      </div>
      
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
