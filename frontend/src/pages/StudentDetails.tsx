import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi, schoolsApi } from '@/services/api';
import { useState } from 'react';

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [newClass, setNewClass] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState('Term1');

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(id!),
    enabled: !!id,
  });

  const { data: schoolLevels } = useQuery({
    queryKey: ['school-levels'],
    queryFn: () => schoolsApi.getLevels(),
  });

  const promoteMutation = useMutation({
    mutationFn: () => studentsApi.promoteOrDemote(id!, newClass, year, term),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      setShowPromoteModal(false);
      alert('Student class updated successfully!');
    },
    onError: () => alert('Failed to update student class'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Not Found</h2>
          <p className="text-gray-600 mb-6">The student you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/students')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500">{title}</h3>
      {children}
    </div>
  );

  const InfoItem = ({ label, value }: { label: string; value: string | undefined | null }) => (
    <div className="mb-3">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-base text-gray-900 font-semibold">{value || 'Not Provided'}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/students')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition"
            >
              <span className="text-xl">←</span> Back to Students
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              🏠 Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center gap-6">
            <div className="bg-white rounded-full p-6 shadow-lg">
              <span className="text-6xl">👤</span>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">
                {[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}
              </h1>
              <div className="flex gap-4 text-lg">
                <span className="bg-white/20 px-4 py-1 rounded-full">📋 {student.admission_no}</span>
                <span className="bg-white/20 px-4 py-1 rounded-full">🎓 {student.class_name || 'No Class'}</span>
                <span className="bg-white/20 px-4 py-1 rounded-full">
                  {student.gender === 'Male' ? '👨' : '👩'} {student.gender}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowPromoteModal(true)}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg"
            >
              🎓 Change Class
            </button>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Personal Information */}
          <InfoCard title="📝 Personal Information">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="First Name" value={student.first_name} />
              <InfoItem label="Middle Name" value={student.middle_name} />
              <InfoItem label="Last Name" value={student.last_name} />
              <InfoItem label="LIN" value={student.lin} />
              <InfoItem label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : null} />
              <InfoItem label="Gender" value={student.gender} />
              <InfoItem label="Nationality" value={student.nationality} />
              <InfoItem label="Religion" value={student.religion} />
            </div>
          </InfoCard>

          {/* Academic Information */}
          <InfoCard title="🎓 Academic Information">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Current Class" value={student.class_name} />
              <InfoItem label="Admission Number" value={student.admission_no} />
              <InfoItem label="Admission Date" value={student.admission_date ? new Date(student.admission_date).toLocaleDateString() : null} />
              <InfoItem label="Residence Type" value={student.residence_type} />
              <InfoItem label="Previous School" value={student.previous_school} />
              <InfoItem label="Previous Class" value={student.previous_class} />
              <InfoItem label="Status" value={student.status} />
            </div>
          </InfoCard>

          {/* Contact Information */}
          <InfoCard title="📞 Contact Information">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Email" value={student.email} />
              <InfoItem label="Phone" value={student.phone} />
              <InfoItem label="District" value={student.district} />
              <InfoItem label="Village/Town" value={student.village} />
              <div className="col-span-2">
                <InfoItem label="Address" value={student.address} />
              </div>
            </div>
          </InfoCard>

          {/* Special Needs */}
          {(student.special_needs || student.disability_status) && (
            <InfoCard title="⚕️ Special Needs & Disability">
              <div className="space-y-4">
                {student.special_needs && <InfoItem label="Special Needs" value={student.special_needs} />}
                {student.disability_status && <InfoItem label="Disability Status" value={student.disability_status} />}
              </div>
            </InfoCard>
          )}
        </div>

        {/* Guardians */}
        {student.guardians && student.guardians.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">👨‍👩‍👧 Guardian Information</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {student.guardians.map((guardian: any, index: number) => (
                <div key={index} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Guardian {index + 1}</h3>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {guardian.relationship}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem label="Full Name" value={guardian.full_name} />
                    <InfoItem label="Phone" value={guardian.phone} />
                    {guardian.alternative_phone && <InfoItem label="Alt. Phone" value={guardian.alternative_phone} />}
                    {guardian.email && <InfoItem label="Email" value={guardian.email} />}
                    {guardian.occupation && <InfoItem label="Occupation" value={guardian.occupation} />}
                    {guardian.workplace && <InfoItem label="Workplace" value={guardian.workplace} />}
                    {guardian.national_id && <InfoItem label="National ID" value={guardian.national_id} />}
                    {guardian.address && (
                      <div className="col-span-2">
                        <InfoItem label="Address" value={guardian.address} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {guardian.is_primary_contact && (
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                        📞 Primary Contact
                      </span>
                    )}
                    {guardian.is_emergency && (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold">
                        🚨 Emergency Contact
                      </span>
                    )}
                    {guardian.is_fee_payer && (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                        💰 Fee Payer
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Promote/Demote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Change Student Class</h3>
            <p className="text-gray-600 mb-4">Current Class: <span className="font-bold text-blue-600">{student.class_name || 'No Class'}</span></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Class Level *</label>
                <select
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select new class</option>
                  {schoolLevels?.levels?.map((level: string) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Term *</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Term1">Term 1</option>
                  <option value="Term2">Term 2</option>
                  <option value="Term3">Term 3</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => promoteMutation.mutate()}
                disabled={!newClass || promoteMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {promoteMutation.isPending ? 'Updating...' : 'Update Class'}
              </button>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
