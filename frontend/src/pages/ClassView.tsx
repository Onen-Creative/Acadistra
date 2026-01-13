import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi, studentsApi, marksApi } from '@/services/api';
import { saveOfflineMark, syncQueue } from '@/services/offline';
import type { Student } from '@/types';

export default function ClassView() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { data: classData } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesApi.get(id!),
  });

  const { data: students } = useQuery({
    queryKey: ['students', id],
    queryFn: () => studentsApi.list({ class_id: id }),
    select: (data) => Array.isArray(data) ? data : data?.students || [],
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => marksApi.batchUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks', id] });
      alert('Marks saved successfully');
    },
  });

  const handleMarkChange = (studentId: string, value: string) => {
    setMarks({ ...marks, [studentId]: parseFloat(value) || 0 });
  };

  const handleSave = async () => {
    const marksArray = Object.entries(marks).map(([studentId, marksObtained]) => ({
      student_id: studentId,
      assessment_id: 'temp-assessment-id',
      marks_obtained: marksObtained,
    }));

    if (!isOnline) {
      for (const mark of marksArray) {
        await saveOfflineMark({
          id: crypto.randomUUID(),
          assessment_id: mark.assessment_id,
          student_id: mark.student_id,
          marks_obtained: mark.marks_obtained,
          status: 'pending',
          created_at: Date.now(),
          updated_at: Date.now(),
        });
      }
      alert('Marks saved offline. Will sync when online.');
      return;
    }

    saveMutation.mutate(marksArray);
  };

  const handleSync = () => {
    syncQueue.sync();
  };

  window.addEventListener('online', () => setIsOnline(true));
  window.addEventListener('offline', () => setIsOnline(false));

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{classData?.name}</h1>
          <div className="flex gap-2">
            {!isOnline && (
              <span className="bg-yellow-500 text-white px-4 py-2 rounded">Offline</span>
            )}
            <button
              onClick={handleSync}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Sync
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Save Marks
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Admission No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Marks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(students || []).map((student: Student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{student.admission_no}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={marks[student.id] || ''}
                      onChange={(e) => handleMarkChange(student.id, e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
