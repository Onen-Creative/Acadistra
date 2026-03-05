'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { clinicApi, studentsApi, classesApi } from '@/services/api';
import toast from 'react-hot-toast';

export default function EmergencyIncidentsPage() {
  const { user } = useRequireAuth(['nurse', 'school_admin']);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const [viewingIncident, setViewingIncident] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchIncidents();
      fetchClasses();
    }
  }, [user]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await clinicApi.listIncidents({} as any);
      setIncidents(response.incidents || []);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classesApi.list();
      setClasses(response.classes || response || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this incident?')) return;
    const loadingToast = toast.loading('Deleting...');
    try {
      await clinicApi.deleteIncident(id);
      toast.success('Incident deleted!', { id: loadingToast });
      fetchIncidents();
    } catch (error) {
      toast.error('Failed to delete', { id: loadingToast });
    }
  };

  const uniqueLevels = [...new Set(classes.map((c: any) => c.level))].filter(Boolean);

  const filteredIncidents = incidents.filter((inc: any) => {
    const matchesSearch = !search ||
      inc.student?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      inc.student?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      inc.description?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = !classFilter || inc.student?.class?.level === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-600 to-orange-700 rounded-xl shadow-lg p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">🚨 Emergency Incidents</h1>
              <p className="text-red-100">Report and track medical emergencies</p>
            </div>
            <button
              onClick={() => { setEditingIncident(null); setShowModal(true); }}
              className="bg-white text-red-600 hover:bg-red-50 px-6 py-3 rounded-lg font-medium shadow-lg"
            >
              + Report Emergency
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded-lg px-4 py-2"
          />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="">All Classes</option>
            {uniqueLevels.map((level: string) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Taken</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Parent</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIncidents.map((incident: any) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <div>{new Date(incident.incident_date).toLocaleDateString()}</div>
                      <div className="text-gray-500 text-xs">{new Date(incident.incident_date).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {incident.student?.first_name} {incident.student?.middle_name ? incident.student?.middle_name + ' ' : ''}{incident.student?.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm">{incident.student?.class?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                        {incident.incident_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{incident.description}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{incident.action_taken}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {incident.parent_notified ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-yellow-600 font-bold">⚠</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setViewingIncident(incident)}
                          className="bg-teal-500 text-white px-2 py-1 rounded text-xs hover:bg-teal-600"
                        >
                          View
                        </button>
                        <button
                          onClick={() => { setEditingIncident(incident); setShowModal(true); }}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(incident.id)}
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
          <IncidentModal
            incident={editingIncident}
            onClose={() => { setShowModal(false); setEditingIncident(null); }}
            onSuccess={() => { setShowModal(false); setEditingIncident(null); fetchIncidents(); }}
          />
        )}

        {viewingIncident && (
          <ViewModal incident={viewingIncident} onClose={() => setViewingIncident(null)} />
        )}
      </div>
    </DashboardLayout>
  );
}

function IncidentModal({ incident, onClose, onSuccess }: any) {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [formData, setFormData] = useState({
    student_id: incident?.student_id || '',
    incident_type: incident?.incident_type || 'accident',
    description: incident?.description || '',
    action_taken: incident?.action_taken || '',
    parent_notified: incident?.parent_notified || false,
    referral_details: incident?.referral_details || '',
    outcome: incident?.outcome || '',
    year: incident?.year || new Date().getFullYear(),
    term: incident?.term || 'Term1'
  });

  useEffect(() => {
    fetchClasses();
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

  const uniqueLevels = [...new Set(classes.map((c: any) => c.level))].filter(Boolean);
  const filteredClasses = selectedLevel ? classes.filter((c: any) => c.level === selectedLevel) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(incident ? 'Updating...' : 'Reporting...');
    try {
      const data = {
        ...formData,
        incident_date: incident?.incident_date || new Date().toISOString()
      };
      if (incident) {
        await clinicApi.updateIncident(incident.id, data);
        toast.success('Incident updated!', { id: loadingToast });
      } else {
        await clinicApi.createIncident(data);
        toast.success('Emergency incident reported!', { id: loadingToast });
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed', { id: loadingToast });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4 text-red-600">{incident ? 'Edit' : 'Report'} Emergency Incident</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Level *</label>
              <select
                value={selectedLevel}
                onChange={(e) => { setSelectedLevel(e.target.value); setSelectedClass(''); setFormData({...formData, student_id: ''}); }}
                className="w-full border rounded-lg px-3 py-2"
                disabled={!!incident}
              >
                <option value="">Select level</option>
                {uniqueLevels.map((level: string) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Class *</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setFormData({...formData, student_id: ''}); }}
                className="w-full border rounded-lg px-3 py-2"
                disabled={!selectedLevel || !!incident}
              >
                <option value="">Select class</option>
                {filteredClasses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Student *</label>
            <select
              required
              value={formData.student_id}
              onChange={(e) => setFormData({...formData, student_id: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              disabled={!selectedClass || !!incident}
            >
              <option value="">Select student</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name} - {s.admission_no}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Incident Type *</label>
              <select
                value={formData.incident_type}
                onChange={(e) => setFormData({...formData, incident_type: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="accident">Accident</option>
                <option value="severe_illness">Severe Illness</option>
                <option value="injury">Injury</option>
                <option value="seizure">Seizure</option>
                <option value="allergic_reaction">Allergic Reaction</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.parent_notified}
                  onChange={(e) => setFormData({...formData, parent_notified: e.target.checked})}
                />
                <span className="text-sm font-medium">Parent Notified</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Describe what happened..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action Taken *</label>
            <textarea
              required
              value={formData.action_taken}
              onChange={(e) => setFormData({...formData, action_taken: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="What actions were taken..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Referral Details</label>
            <textarea
              value={formData.referral_details}
              onChange={(e) => setFormData({...formData, referral_details: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Hospital name, ambulance details, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Outcome</label>
            <input
              value={formData.outcome}
              onChange={(e) => setFormData({...formData, outcome: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Current status or outcome"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
              {incident ? 'Update' : 'Report'} Incident
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

function ViewModal({ incident, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-red-600">Emergency Incident Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
        </div>
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="font-bold text-lg">
              {incident.student?.first_name} {incident.student?.middle_name ? incident.student?.middle_name + ' ' : ''}{incident.student?.last_name}
            </p>
            <p className="text-sm text-gray-600">{incident.student?.class?.name || '-'}</p>
            <p className="text-sm text-gray-600">{new Date(incident.incident_date).toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Incident Type</p>
              <p className="font-bold text-orange-700">{incident.incident_type}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Parent Notified</p>
              <p className="font-bold text-blue-700">{incident.parent_notified ? 'Yes ✓' : 'No'}</p>
            </div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-gray-700">Description</p>
              <p className="text-gray-600">{incident.description}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Action Taken</p>
              <p className="text-gray-600">{incident.action_taken}</p>
            </div>
            {incident.referral_details && (
              <div>
                <p className="text-sm font-bold text-gray-700">Referral Details</p>
                <p className="text-gray-600">{incident.referral_details}</p>
              </div>
            )}
            {incident.outcome && (
              <div>
                <p className="text-sm font-bold text-gray-700">Outcome</p>
                <p className="text-gray-600">{incident.outcome}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
