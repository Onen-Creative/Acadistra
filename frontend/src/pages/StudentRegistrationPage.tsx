import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { schoolsApi, studentsApi } from '@/services/api';

interface School {
  id: string;
  name: string;
  config: {
    levels?: string[];
  };
}

interface Class {
  id: string;
  name: string;
  level: string;
  year: number;
  term: string;
}

interface Guardian {
  relationship: string;
  full_name: string;
  phone: string;
  alternative_phone?: string;
  email?: string;
  occupation?: string;
  address?: string;
  workplace?: string;
  work_address?: string;
  is_primary_contact: boolean;
  is_emergency: boolean;
  is_fee_payer: boolean;
  national_id?: string;
}

interface RegistrationData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  gender: string;
  nationality?: string;
  religion?: string;
  lin?: string;
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  village?: string;
  class_level: string;
  term: string;
  year: number;
  residence_type?: string;
  previous_school?: string;
  previous_class?: string;
  special_needs?: string;
  disability_status?: string;
  guardians: Guardian[];
}

export default function StudentRegistrationPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationData>({
    first_name: '',
    last_name: '',
    gender: '',
    class_level: '',
    term: 'Term1',
    year: new Date().getFullYear(),
    guardians: [{
      relationship: 'Father',
      full_name: '',
      phone: '',
      is_primary_contact: true,
      is_emergency: true,
      is_fee_payer: true,
    }],
  });

  const { data: school, isError: schoolError } = useQuery<School>({
    queryKey: ['school'],
    queryFn: async () => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.school_id) throw new Error('No school assigned');
      return await schoolsApi.get(user.school_id);
    },
    enabled: !!localStorage.getItem('user'),
    retry: false,
  });

  const { data: classes } = useQuery<Class[]>({
    queryKey: ['classes', formData.term, formData.year],
    queryFn: async () => {
      const response = await schoolsApi.list();
      return response.classes || response || [];
    },
    enabled: !!localStorage.getItem('access_token'),
    retry: false,
  });

  const schoolLevels = (() => {
    if (!school?.config?.levels) return [];
    const levels = school.config.levels;
    // Handle if levels is already an array
    if (Array.isArray(levels)) return levels;
    // Handle if levels is an object with numeric keys
    if (typeof levels === 'object') return Object.values(levels);
    return [];
  })();
  const availableClasses = classes?.filter(c => c.level === formData.class_level) || [];

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      return await studentsApi.create(data);
    },
    onSuccess: () => {
      alert('Student registered successfully!');
      navigate('/students');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to register student');
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGuardianChange = (index: number, field: string, value: any) => {
    const newGuardians = [...formData.guardians];
    newGuardians[index] = { ...newGuardians[index], [field]: value };
    setFormData(prev => ({ ...prev, guardians: newGuardians }));
  };

  const addGuardian = () => {
    setFormData(prev => ({
      ...prev,
      guardians: [...prev.guardians, {
        relationship: 'Mother',
        full_name: '',
        phone: '',
        is_primary_contact: false,
        is_emergency: true,
        is_fee_payer: false,
      }],
    }));
  };

  const removeGuardian = (index: number) => {
    if (formData.guardians.length > 1) {
      setFormData(prev => ({
        ...prev,
        guardians: prev.guardians.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };



  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {schoolError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Authentication error. Please <button onClick={() => navigate('/login')} className="underline font-semibold">login again</button>.
          </div>
        )}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Student Registration</h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                🏠 Dashboard
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex mb-8">
            {['Student Info', 'Contact Details', 'Guardian Info'].map((step, idx) => (
              <div key={idx} className="flex-1 flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep > idx ? 'bg-blue-600 text-white' : currentStep === idx + 1 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {idx + 1}
                </div>
                <div className={`flex-1 h-1 ${idx < 2 ? (currentStep > idx + 1 ? 'bg-blue-600' : 'bg-gray-300') : ''}`} />
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Student Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Student Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={formData.middle_name || ''}
                      onChange={(e) => handleInputChange('middle_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                    <select
                      required
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                    <input
                      type="text"
                      value={formData.nationality || 'Ugandan'}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
                    <input
                      type="text"
                      value={formData.religion || ''}
                      onChange={(e) => handleInputChange('religion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LIN (Learner ID)</label>
                    <input
                      type="text"
                      value={formData.lin || ''}
                      onChange={(e) => handleInputChange('lin', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Level *</label>
                    <select
                      required
                      value={formData.class_level}
                      onChange={(e) => handleInputChange('class_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      disabled={!school || schoolLevels.length === 0}
                    >
                      <option value="">{!school ? 'Loading levels...' : schoolLevels.length === 0 ? 'No levels configured' : 'Select Level'}</option>
                      {schoolLevels.map((level: string) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    {school && schoolLevels.length === 0 && (
                      <p className="mt-1 text-sm text-red-600">No academic levels configured for this school</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
                    <select
                      required
                      value={formData.term}
                      onChange={(e) => handleInputChange('term', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Term1">Term 1</option>
                      <option value="Term2">Term 2</option>
                      <option value="Term3">Term 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                    <input
                      type="number"
                      required
                      value={formData.year}
                      onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Residence Type</label>
                  <select
                    value={formData.residence_type || 'Day'}
                    onChange={(e) => handleInputChange('residence_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Day">Day Scholar</option>
                    <option value="Boarding">Boarding</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous School</label>
                    <input
                      type="text"
                      value={formData.previous_school || ''}
                      onChange={(e) => handleInputChange('previous_school', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Class</label>
                    <input
                      type="text"
                      value={formData.previous_class || ''}
                      onChange={(e) => handleInputChange('previous_class', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Contact & Address Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+256-700-000-000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <input
                      type="text"
                      value={formData.district || ''}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Village/Town</label>
                    <input
                      type="text"
                      value={formData.village || ''}
                      onChange={(e) => handleInputChange('village', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Needs</label>
                  <textarea
                    value={formData.special_needs || ''}
                    onChange={(e) => handleInputChange('special_needs', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disability Status</label>
                  <input
                    type="text"
                    value={formData.disability_status || ''}
                    onChange={(e) => handleInputChange('disability_status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Guardian Info */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Guardian Information</h2>
                  <button
                    type="button"
                    onClick={addGuardian}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    + Add Guardian
                  </button>
                </div>

                {formData.guardians.map((guardian, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Guardian {index + 1}</h3>
                      {formData.guardians.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGuardian(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                        <select
                          required
                          value={guardian.relationship}
                          onChange={(e) => handleGuardianChange(index, 'relationship', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Legal Guardian">Legal Guardian</option>
                          <option value="Sponsor">Sponsor</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={guardian.full_name}
                          onChange={(e) => handleGuardianChange(index, 'full_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                        <input
                          type="tel"
                          required
                          value={guardian.phone}
                          onChange={(e) => handleGuardianChange(index, 'phone', e.target.value)}
                          placeholder="+256-700-000-000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Phone</label>
                        <input
                          type="tel"
                          value={guardian.alternative_phone || ''}
                          onChange={(e) => handleGuardianChange(index, 'alternative_phone', e.target.value)}
                          placeholder="+256-700-000-000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={guardian.email || ''}
                          onChange={(e) => handleGuardianChange(index, 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                        <input
                          type="text"
                          value={guardian.occupation || ''}
                          onChange={(e) => handleGuardianChange(index, 'occupation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={guardian.address || ''}
                        onChange={(e) => handleGuardianChange(index, 'address', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Workplace</label>
                        <input
                          type="text"
                          value={guardian.workplace || ''}
                          onChange={(e) => handleGuardianChange(index, 'workplace', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                        <input
                          type="text"
                          value={guardian.national_id || ''}
                          onChange={(e) => handleGuardianChange(index, 'national_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={guardian.is_primary_contact}
                          onChange={(e) => handleGuardianChange(index, 'is_primary_contact', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Primary Contact</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={guardian.is_emergency}
                          onChange={(e) => handleGuardianChange(index, 'is_emergency', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Emergency Contact</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={guardian.is_fee_payer}
                          onChange={(e) => handleGuardianChange(index, 'is_fee_payer', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Fee Payer</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {registerMutation.isPending ? 'Registering...' : 'Register Student'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
