import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resultsApi, subjectsApi, studentsApi, classesApi } from '@/services/api';
import { useActivityDialog } from '@/hooks/useActivityDialog';
import ActivityDialog from '@/components/ActivityDialog';

const calculateGrade = (total: number): string => {
  if (total >= 80) return 'A';
  if (total >= 65) return 'B';
  if (total >= 50) return 'C';
  if (total >= 35) return 'D';
  return 'E';
};

export default function BulkResultsEntry() {
  const queryClient = useQueryClient();
  const { dialog, showSuccess, showError, closeDialog } = useActivityDialog();
  const [selectedClassLevel, setSelectedClassLevel] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(2026);
  const [marks, setMarks] = useState<Record<string, { ca: string; exam: string; total: number; grade: string }>>({});
  const [existingResults, setExistingResults] = useState<Record<string, any>>({});
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTeacher = user.role === 'teacher';

  const { data: levels } = useQuery({
    queryKey: ['class-levels'],
    queryFn: () => classesApi.getLevels(),
  });

  const { data: students } = useQuery({
    queryKey: ['students', selectedClassLevel, term, year],
    queryFn: () => studentsApi.list(selectedClassLevel ? { class_level: selectedClassLevel, term, year: String(year), limit: 100 } : undefined),
    enabled: !!selectedClassLevel,
    select: (data) => Array.isArray(data) ? data : data?.students || [],
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', selectedClassLevel],
    queryFn: () => subjectsApi.list({ level: selectedClassLevel }),
    enabled: !!selectedClassLevel,
  });

  useQuery({
    queryKey: ['existing-results', selectedSubject, term, year],
    queryFn: async () => {
      if (!students || !selectedSubject) return {};
      
      const results: Record<string, any> = {};
      const newMarks: Record<string, { ca: string; exam: string; total: number; grade: string }> = {};
      
      await Promise.all(
        students.map(async (student: any) => {
          try {
            const studentResults = await resultsApi.getByStudent(student.id, { term, year: year.toString() });
            const subjectResult = studentResults.find((r: any) => r.subject_id === selectedSubject);
            if (subjectResult) {
              results[student.id] = subjectResult;
              const ca = subjectResult.raw_marks?.ca?.toString() || '';
              const exam = subjectResult.raw_marks?.exam?.toString() || '';
              const total = subjectResult.raw_marks?.total || 0;
              const grade = subjectResult.final_grade || '';
              newMarks[student.id] = { ca, exam, total, grade };
            }
          } catch (error) {
            // Ignore errors
          }
        })
      );
      
      setExistingResults(results);
      setMarks(newMarks);
      return results;
    },
    enabled: !!students && !!selectedSubject,
  });

  const createResultMutation = useMutation({
    mutationFn: (data: any) => resultsApi.createOrUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
  });

  const handleMarkChange = (studentId: string, field: 'ca' | 'exam', value: string) => {
    if (isTeacher && Object.keys(existingResults).length > 0) {
      return;
    }
    
    setMarks(prev => {
      const current = prev[studentId] || { ca: '', exam: '', total: 0, grade: '' };
      const updated = { ...current, [field]: value };
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

  const calculateTotal = (studentId: string) => {
    return marks[studentId]?.total || 0;
  };

  const getGrade = (studentId: string) => {
    return marks[studentId]?.grade || '-';
  };

  const handleSaveAll = async () => {
    if (!selectedSubject) {
      showError('Missing Subject', 'Please select a subject before saving marks.');
      return;
    }

    const promises = Object.entries(marks)
      .filter(([_, m]) => m.ca || m.exam)
      .map(([studentId, m]) => {
        const ca = parseFloat(m.ca || '0');
        const exam = parseFloat(m.exam || '0');
        const total = ca + exam;
        
        return createResultMutation.mutateAsync({
          student_id: studentId,
          subject_id: selectedSubject,
          term,
          year: year,
          final_grade: calculateGrade(total),
          raw_marks: { ca, exam, total },
        });
      });

    try {
      await Promise.all(promises);
      showSuccess('Success!', 'All marks have been saved successfully');
      setMarks({});
    } catch (error) {
      showError('Error!', 'Failed to save marks. Please try again.');
    }
  };

  return (
    <div className="pb-16 sm:pb-0">
      <div className="mb-4 sm:mb-6 px-3 sm:px-0">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Bulk Results Entry</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Enter marks for all students in a class</p>
        {isTeacher && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-700">
              <strong>Teacher Mode:</strong> {Object.keys(existingResults).length > 0 
                ? 'Marks already exist for this subject/term/class. All fields are read-only.' 
                : 'You can enter new marks but cannot edit existing ones.'}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100 mx-3 sm:mx-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Class *</label>
            <select
              value={selectedClassLevel}
              onChange={(e) => { setSelectedClassLevel(e.target.value); setSelectedSubject(''); setMarks({}); }}
              className="w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            >
              <option value="">Select class</option>
              {levels?.map((level: any) => (
                <option key={level.level} value={level.level}>{level.level}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Subject *</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedClassLevel}
            >
              <option value="">Select subject</option>
              {subjects?.map((subj: any) => (
                <option key={subj.id} value={subj.id}>{subj.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Term *</label>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white">
              <option>Term1</option>
              <option>Term2</option>
              <option>Term3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Year *</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {selectedClassLevel && selectedSubject && students && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 mx-3 sm:mx-0">
          <div className="block sm:hidden">
            {(students || []).map((student: any) => {
              const total = calculateTotal(student.id);
              const grade = getGrade(student.id);
              const isReadOnly = isTeacher && Object.keys(existingResults).length > 0;
              return (
                <div key={student.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                  <div className="mb-3">
                    <p className="font-semibold text-gray-900 text-sm">{student.first_name} {student.last_name}</p>
                    <p className="text-xs text-gray-500">{student.admission_no}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CA (20)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        placeholder="0"
                        value={marks[student.id]?.ca || ''}
                        onChange={(e) => handleMarkChange(student.id, 'ca', e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full border rounded-lg px-2 py-2 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          isReadOnly ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500' : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Exam (80)</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        step="0.5"
                        placeholder="0"
                        value={marks[student.id]?.exam || ''}
                        onChange={(e) => handleMarkChange(student.id, 'exam', e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full border rounded-lg px-2 py-2 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          isReadOnly ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500' : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="font-semibold text-gray-900">{total || '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Grade</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                        grade === 'B' ? 'bg-blue-100 text-blue-700' :
                        grade === 'C' ? 'bg-amber-100 text-amber-700' :
                        grade === 'D' ? 'bg-orange-100 text-orange-700' :
                        grade === 'E' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {grade || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Student</th>
                  <th className="px-3 lg:px-6 py-3 lg:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">CA (20)</th>
                  <th className="px-3 lg:px-6 py-3 lg:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Exam (80)</th>
                  <th className="px-3 lg:px-6 py-3 lg:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                  <th className="px-3 lg:px-6 py-3 lg:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Grade</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(students || []).map((student: any) => {
                  const total = calculateTotal(student.id);
                  const grade = getGrade(student.id);
                  const isReadOnly = isTeacher && Object.keys(existingResults).length > 0;
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-3 lg:px-6 py-3 lg:py-4">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{student.first_name} {student.last_name}</p>
                          <p className="text-xs text-gray-500">{student.admission_no}</p>
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          placeholder="0"
                          value={marks[student.id]?.ca || ''}
                          onChange={(e) => handleMarkChange(student.id, 'ca', e.target.value)}
                          disabled={isReadOnly}
                          className={`w-14 sm:w-16 lg:w-20 border rounded-lg px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                            isReadOnly ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500' : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        />
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4">
                        <input
                          type="number"
                          min="0"
                          max="80"
                          step="0.5"
                          placeholder="0"
                          value={marks[student.id]?.exam || ''}
                          onChange={(e) => handleMarkChange(student.id, 'exam', e.target.value)}
                          disabled={isReadOnly}
                          className={`w-14 sm:w-16 lg:w-20 border rounded-lg px-1 sm:px-2 py-1 sm:py-2 text-center text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                            isReadOnly ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500' : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        />
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-center font-semibold text-gray-900 text-sm">{total || '—'}</td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-center">
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                          grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                          grade === 'B' ? 'bg-blue-100 text-blue-700' :
                          grade === 'C' ? 'bg-amber-100 text-amber-700' :
                          grade === 'D' ? 'bg-orange-100 text-orange-700' :
                          grade === 'E' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {grade || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t">
            <button
              onClick={handleSaveAll}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
            >
              💾 <span className="hidden sm:inline">Save All Results</span><span className="sm:hidden">Save Results</span>
            </button>
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
