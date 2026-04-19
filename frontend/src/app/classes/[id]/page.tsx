'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { classesApi, studentsApi, attendanceApi, subjectsApi } from '@/services/api'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader, StatCard } from '@/components/ui/BeautifulComponents'
import Link from 'next/link'

export default function ClassDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string

  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => classesApi.get(classId),
  })

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['students', classId],
    queryFn: () => studentsApi.list({ class_id: classId, limit: -1 }),
    enabled: !!classId,
  })

  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats', classId],
    queryFn: () => attendanceApi.getStats({ class_id: classId }),
    enabled: !!classId,
  })

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', classData?.level],
    queryFn: () => subjectsApi.list({ level: classData?.level }),
    enabled: !!classData?.level,
  })

  if (classLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading class details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const students = Array.isArray(studentsData) ? studentsData : studentsData?.students || []
  const subjects = Array.isArray(subjectsData) ? subjectsData : subjectsData?.subjects || []
  const classInfo = classData

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader 
          title={classInfo?.name || 'Class Details'}
          subtitle={`${classInfo?.level} • Year ${classInfo?.year} • ${classInfo?.term}`}
          action={
            <button
              onClick={() => router.back()}
              className="px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-300"
            >
              ← Back
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard 
            title="Total Students" 
            value={students.length} 
            icon="👥" 
            gradient="from-blue-500 to-blue-700" 
          />
          <StatCard 
            title="Capacity" 
            value={`${students.length}/${classInfo?.capacity || 0}`} 
            icon="📊" 
            gradient="from-green-500 to-green-700" 
          />
          <StatCard 
            title="Attendance Rate" 
            value={`${Math.round(attendanceStats?.percentage || 0)}%`} 
            icon="✓" 
            gradient="from-purple-500 to-purple-700" 
          />
          <StatCard 
            title="Subjects" 
            value={subjects.length} 
            icon="📚" 
            gradient="from-orange-500 to-orange-700" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>ℹ️</span> Class Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Level:</span>
                <span className="font-semibold text-gray-800">{classInfo?.level}</span>
              </div>
              {classInfo?.stream && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Stream:</span>
                  <span className="font-semibold text-gray-800">{classInfo.stream}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Academic Year:</span>
                <span className="font-semibold text-gray-800">{classInfo?.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Term:</span>
                <span className="font-semibold text-gray-800">{classInfo?.term}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Capacity:</span>
                <span className="font-semibold text-gray-800">{classInfo?.capacity}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>👨🏫</span> Class Teacher
            </h3>
            {classInfo?.teacher_profile && classInfo.teacher_profile.staff ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                    {classInfo.teacher_profile.staff.first_name?.charAt(0)}{classInfo.teacher_profile.staff.last_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{classInfo.teacher_profile.staff.first_name} {classInfo.teacher_profile.staff.last_name}</p>
                    <p className="text-sm text-gray-500">{classInfo.teacher_profile.staff.employee_id}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">No class teacher assigned</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📈</span> Attendance Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Present:</span>
                <span className="font-semibold text-green-600">{attendanceStats?.present || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Absent:</span>
                <span className="font-semibold text-red-600">{attendanceStats?.absent || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Late:</span>
                <span className="font-semibold text-yellow-600">{attendanceStats?.late || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rate:</span>
                <span className="font-semibold text-blue-600">{Math.round(attendanceStats?.percentage || 0)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span>👥</span> Students ({students.length})
              </h3>
              <Link 
                href={`/students?class_id=${classId}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
              >
                View All →
              </Link>
            </div>
            {studentsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : students.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.slice(0, 10).map((student: any) => (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                      {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{student.first_name} {student.last_name}</p>
                      <p className="text-sm text-gray-500">{student.admission_number}</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Link>
                ))}
                {students.length > 10 && (
                  <p className="text-center text-sm text-gray-500 pt-2">
                    And {students.length - 10} more students...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No students enrolled</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span>📚</span> Subjects ({subjects.length})
              </h3>
            </div>
            {subjects.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subjects.map((subject: any) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold">
                        {subject.code || subject.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{subject.name}</p>
                        {subject.code && (
                          <p className="text-sm text-gray-500">{subject.code}</p>
                        )}
                      </div>
                    </div>
                    {subject.is_compulsory && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                        Compulsory
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No subjects configured</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-4 flex-wrap">
          <Link
            href={`/attendance?class_id=${classId}`}
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            📋 Mark Attendance
          </Link>
          <Link
            href="/marks/enter"
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            📝 Enter Marks
          </Link>
          <Link
            href={`/students?class_id=${classId}`}
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            👥 Manage Students
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
