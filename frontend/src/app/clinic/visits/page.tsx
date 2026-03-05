'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { clinicApi, studentsApi, classesApi } from '@/services/api';
import toast from 'react-hot-toast';

export default function ClinicVisitsPage() {
  const { user } = useRequireAuth(['nurse', 'school_admin']);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [viewingVisit, setViewingVisit] = useState<any>(null);

  useEffect(() => {
    if (user) fetchVisits();
  }, [user]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const response = await clinicApi.listVisits({ limit: 100 });
      setVisits(response.visits || []);
    } catch (error) {
      console.error('Failed to fetch visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this visit?')) return;
    const loadingToast = toast.loading('Deleting...');
    try {
      await clinicApi.deleteVisit(id);
      toast.success('Visit deleted!', { id: loadingToast });
      fetchVisits();
    } catch (error) {
      toast.error('Failed to delete', { id: loadingToast });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">🩺 Clinic Visits</h1>
              <p className="text-teal-100">Record and manage student health visits</p>
            </div>
            <button
              onClick={() => { setEditingVisit(null); setShowModal(true); }}
              className="bg-white text-teal-600 hover:bg-teal-50 px-6 py-3 rounded-lg font-medium shadow-lg"
            >
              + New Visit
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Complaint</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Outcome</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visits.map((visit: any) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {new Date(visit.visit_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {visit.student?.first_name} {visit.student?.middle_name ? visit.student?.middle_name + ' ' : ''}{visit.student?.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm">{visit.student?.class?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm truncate max-w-xs">{visit.symptoms}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        visit.outcome === 'returned_to_class' ? 'bg-green-100 text-green-800' :
                        visit.outcome === 'referred' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {visit.outcome?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setViewingVisit(visit)}
                          className="bg-teal-500 text-white px-2 py-1 rounded text-xs hover:bg-teal-600"
                        >
                          View
                        </button>
                        <button
                          onClick={() => { setEditingVisit(visit); setShowModal(true); }}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(visit.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <VisitModal
            visit={editingVisit}
            onClose={() => { setShowModal(false); setEditingVisit(null); }}
            onSuccess={() => { setShowModal(false); setEditingVisit(null); fetchVisits(); }}
          />
        )}

        {viewingVisit && (
          <ViewModal visit={viewingVisit} onClose={() => setViewingVisit(null)} />
        )}
      </div>
    </DashboardLayout>
  );
}

function VisitModal({ visit, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    student_id: visit?.student_id || '',
    symptoms: visit?.symptoms || '',
    diagnosis: visit?.diagnosis || '',
    treatment: visit?.treatment || '',
    outcome: visit?.outcome || 'returned_to_class',
    temperature: visit?.temperature || '',
    blood_pressure: visit?.blood_pressure || '',
    pulse: visit?.pulse || '',
    notes: visit?.notes || ''
  });
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);

  useEffect(() => {
    fetchClasses();
    fetchMedicines();
    if (visit) {
      fetchVisitTests();
      fetchVisitMedications();
    }
  }, []);

  useEffect(() => {
    if (selectedClass) fetchStudents();
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await classesApi.list();
      setClasses(response.classes || response || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await studentsApi.list({ class_id: selectedClass, limit: 1000 });
      setStudents(response.students || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchMedicines = async () => {
    try {
      const response = await clinicApi.listMedicines({ limit: 1000 });
      setMedicines(response.medicines || []);
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
    }
  };

  const fetchVisitTests = async () => {
    try {
      const response = await clinicApi.listTests({ visit_id: visit.id });
      setTests((response.tests || []).map((t: any) => ({
        test_type: t.test_type,
        result: t.result,
        notes: t.notes || ''
      })));
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
  };

  const fetchVisitMedications = async () => {
    try {
      const response = await clinicApi.getMedicationHistory({ visit_id: visit.id });
      setMedications((response.history || []).map((m: any) => ({
        medicine_id: m.medicine_id,
        quantity_given: m.quantity_given,
        dose: m.dose,
        notes: m.notes || ''
      })));
    } catch (error) {
      console.error('Failed to fetch medications:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(visit ? 'Updating...' : 'Creating...');
    try {
      const data = {
        ...formData,
        visit_date: new Date().toISOString(),
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
        tests: tests.map(t => ({
          test_type: t.test_type,
          test_date: new Date().toISOString(),
          result: t.result,
          notes: t.notes || ''
        })),
        medications: medications.map(m => ({
          medicine_id: m.medicine_id,
          dose: m.dose,
          quantity_given: parseInt(m.quantity_given) || 0,
          notes: m.notes || ''
        }))
      };
      
      if (visit) {
        await clinicApi.updateVisit(visit.id, data);
        toast.success('Visit updated!', { id: loadingToast });
      } else {
        await clinicApi.createVisit(data);
        toast.success('Visit recorded!', { id: loadingToast });
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed', { id: loadingToast });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">{visit ? 'Edit' : 'New'} Visit</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Class *</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setFormData({...formData, student_id: ''}); }}
                className="w-full border rounded-lg px-3 py-2"
                disabled={!!visit}
              >
                <option value="">Select class</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Student *</label>
              <select
                required
                value={formData.student_id}
                onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                disabled={!selectedClass || !!visit}
              >
                <option value="">Select student</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Symptoms *</label>
            <textarea
              required
              value={formData.symptoms}
              onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">BP</label>
              <input
                value={formData.blood_pressure}
                onChange={(e) => setFormData({...formData, blood_pressure: e.target.value})}
                placeholder="120/80"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pulse</label>
              <input
                type="number"
                value={formData.pulse}
                onChange={(e) => setFormData({...formData, pulse: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Diagnosis</label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Treatment (Non-medication care)</label>
            <textarea
              value={formData.treatment}
              onChange={(e) => setFormData({...formData, treatment: e.target.value})}
              placeholder="e.g., Rest, Cold compress, First aid, Observation"
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>

          {/* Tests Section */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Medical Tests</h4>
            {tests.map((test, idx) => (
              <div key={idx} className="bg-purple-50 p-3 rounded-lg mb-2 grid grid-cols-4 gap-3">
                <select
                  value={test.test_type}
                  onChange={(e) => {
                    const newTests = [...tests];
                    newTests[idx].test_type = e.target.value;
                    setTests(newTests);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="malaria_rdt">Malaria RDT</option>
                  <option value="pregnancy">Pregnancy Test</option>
                  <option value="blood_sugar">Blood Sugar</option>
                  <option value="hiv_test">HIV Test</option>
                  <option value="other">Other</option>
                </select>
                <input
                  value={test.result}
                  onChange={(e) => {
                    const newTests = [...tests];
                    newTests[idx].result = e.target.value;
                    setTests(newTests);
                  }}
                  placeholder="Result"
                  className="border rounded px-2 py-1 text-sm"
                />
                <input
                  value={test.notes}
                  onChange={(e) => {
                    const newTests = [...tests];
                    newTests[idx].notes = e.target.value;
                    setTests(newTests);
                  }}
                  placeholder="Notes"
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setTests(tests.filter((_, i) => i !== idx))}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTests([...tests, { test_type: 'malaria_rdt', result: '', notes: '' }])}
              className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 text-sm"
            >
              + Add Test
            </button>
          </div>

          {/* Medications Section */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Medications Given</h4>
            {medications.map((med, idx) => (
              <div key={idx} className="bg-green-50 p-3 rounded-lg mb-2 grid grid-cols-5 gap-3">
                <select
                  value={med.medicine_id}
                  onChange={(e) => {
                    const newMeds = [...medications];
                    newMeds[idx].medicine_id = e.target.value;
                    setMedications(newMeds);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select medicine</option>
                  {medicines.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={med.quantity_given}
                  onChange={(e) => {
                    const newMeds = [...medications];
                    newMeds[idx].quantity_given = e.target.value;
                    setMedications(newMeds);
                  }}
                  placeholder="Qty"
                  className="border rounded px-2 py-1 text-sm"
                />
                <select
                  value={med.dose}
                  onChange={(e) => {
                    const newMeds = [...medications];
                    newMeds[idx].dose = e.target.value;
                    setMedications(newMeds);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Dosage</option>
                  <optgroup label="Tablets/Capsules">
                    <option value="1 tablet once">1 tablet once</option>
                    <option value="1 tablet twice daily">1 tablet twice daily</option>
                    <option value="1 tablet three times daily">1 tablet 3x daily</option>
                    <option value="2 tablets once">2 tablets once</option>
                    <option value="2 tablets twice daily">2 tablets twice daily</option>
                    <option value="2 tablets three times daily">2 tablets 3x daily</option>
                    <option value="4 tablets once daily">4 tablets once daily</option>
                    <option value="4 tablets twice daily">4 tablets twice daily</option>
                  </optgroup>
                  <optgroup label="Custom">
                    <option value="custom">Custom (specify in notes)</option>
                  </optgroup>
                  <optgroup label="Syrup/Liquid">
                    <option value="5ml once">5ml (1 tsp) once</option>
                    <option value="5ml twice daily">5ml (1 tsp) twice daily</option>
                    <option value="5ml three times daily">5ml (1 tsp) 3x daily</option>
                    <option value="10ml once">10ml (2 tsp) once</option>
                    <option value="10ml twice daily">10ml (2 tsp) twice daily</option>
                    <option value="10ml three times daily">10ml (2 tsp) 3x daily</option>
                  </optgroup>
                  <optgroup label="Topical (Cream/Ointment)">
                    <option value="Apply thin layer once">Apply thin layer once</option>
                    <option value="Apply thin layer twice daily">Apply thin layer twice daily</option>
                    <option value="Apply thin layer three times daily">Apply thin layer 3x daily</option>
                    <option value="Apply as needed">Apply as needed</option>
                  </optgroup>
                  <optgroup label="Drops">
                    <option value="2 drops once">2 drops once</option>
                    <option value="2 drops twice daily">2 drops twice daily</option>
                    <option value="2 drops three times daily">2 drops 3x daily</option>
                    <option value="3 drops twice daily">3 drops twice daily</option>
                  </optgroup>
                  <optgroup label="Injection">
                    <option value="Single dose IM">Single dose IM</option>
                    <option value="Single dose IV">Single dose IV</option>
                    <option value="Single dose SC">Single dose SC</option>
                  </optgroup>
                </select>
                <input
                  value={med.notes}
                  onChange={(e) => {
                    const newMeds = [...medications];
                    newMeds[idx].notes = e.target.value;
                    setMedications(newMeds);
                  }}
                  placeholder="Instructions"
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMedications([...medications, { medicine_id: '', quantity_given: '', dose: '', notes: '' }])}
              className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 text-sm"
            >
              + Add Medication
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Outcome *</label>
            <select
              value={formData.outcome}
              onChange={(e) => setFormData({...formData, outcome: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="returned_to_class">Returned to Class</option>
              <option value="rest_at_clinic">Rest at Clinic</option>
              <option value="rest_at_dormitory">Rest at Dormitory</option>
              <option value="sent_home">Sent Home</option>
              <option value="referred">Referred to Hospital</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700">
              {visit ? 'Update' : 'Save'} Visit
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewModal({ visit, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Visit Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="space-y-4">
          <div className="bg-teal-50 p-4 rounded-lg">
            <p className="font-bold text-lg">
              {visit.student?.first_name} {visit.student?.middle_name ? visit.student?.middle_name + ' ' : ''}{visit.student?.last_name}
            </p>
            <p className="text-sm text-gray-600">{new Date(visit.visit_date).toLocaleString()}</p>
          </div>
          {(visit.temperature || visit.blood_pressure || visit.pulse) && (
            <div className="grid grid-cols-3 gap-3">
              {visit.temperature && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Temperature</p>
                  <p className="text-lg font-bold text-red-600">{visit.temperature}°C</p>
                </div>
              )}
              {visit.blood_pressure && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Blood Pressure</p>
                  <p className="text-lg font-bold text-blue-600">{visit.blood_pressure}</p>
                </div>
              )}
              {visit.pulse && (
                <div className="bg-pink-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Pulse</p>
                  <p className="text-lg font-bold text-pink-600">{visit.pulse} bpm</p>
                </div>
              )}
            </div>
          )}
          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-gray-700">Symptoms</p>
              <p className="text-gray-600">{visit.symptoms}</p>
            </div>
            {visit.diagnosis && (
              <div>
                <p className="text-sm font-bold text-gray-700">Diagnosis</p>
                <p className="text-gray-600">{visit.diagnosis}</p>
              </div>
            )}
            {visit.treatment && (
              <div>
                <p className="text-sm font-bold text-gray-700">Treatment (Non-medication)</p>
                <p className="text-gray-600">{visit.treatment}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-gray-700">Outcome</p>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                visit.outcome === 'returned_to_class' ? 'bg-green-100 text-green-800' :
                visit.outcome === 'referred' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {visit.outcome?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
