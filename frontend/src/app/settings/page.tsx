'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

const UGANDA_HOLIDAYS = [
  { date: '2026-01-01', name: 'New Year\'s Day' },
  { date: '2026-01-26', name: 'NRM Liberation Day' },
  { date: '2026-03-08', name: 'International Women\'s Day' },
  { date: '2026-04-18', name: 'Good Friday' },
  { date: '2026-04-21', name: 'Easter Monday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-06-03', name: 'Martyrs Day' },
  { date: '2026-06-09', name: 'National Heroes Day' },
  { date: '2026-10-09', name: 'Independence Day' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-26', name: 'Boxing Day' },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('calendar')

  const sections = [
    { id: 'calendar', name: 'Calendar & Terms', icon: '📅' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'security', name: 'Security', icon: '🔒' },
  ]

  const handleSave = async (section: string, data: any) => {
    try {
      const settings = JSON.parse(localStorage.getItem('school_settings') || '{}')
      settings[section] = data
      localStorage.setItem('school_settings', JSON.stringify(settings))
      
      // Save to backend
      await api.put('/school-settings', { section, data })
      
      toast.success('Settings saved successfully')
      return true
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save settings')
      return false
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="lg:w-64 bg-white shadow-lg">
          <div className="p-4 lg:p-6 border-b">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">Settings</h2>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">Manage your school</p>
          </div>
          <nav className="p-2 lg:p-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-colors text-sm lg:text-base ${
                  activeSection === section.id
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg lg:text-xl">{section.icon}</span>
                <span>{section.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 lg:p-8">
            {activeSection === 'calendar' && <CalendarSection onSave={handleSave} />}
            {activeSection === 'notifications' && <NotificationsSection onSave={handleSave} />}
            {activeSection === 'security' && <SecuritySection onSave={handleSave} />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function CalendarSection({ onSave }: any) {
  const [holidays, setHolidays] = useState(UGANDA_HOLIDAYS);
  const [newHoliday, setNewHoliday] = useState({date: '', name: ''});
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    term1_start: '', term1_end: '',
    term2_start: '', term2_end: '',
    term3_start: '', term3_end: ''
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load from school settings
        const response = await api.get('/school-settings');
        const saved = response.data;
        
        // Also load from term_dates table
        const termDatesResponse = await api.get('/term-dates');
        const termDates = termDatesResponse.data;
        
        // Load from calendar holidays
        const holidaysResponse = await api.get('/calendar/holidays');
        const savedHolidays = holidaysResponse.data;
        
        if (saved.calendar) {
          if (saved.calendar.term1_start) setFormData(prev => ({ ...prev, term1_start: saved.calendar.term1_start }));
          if (saved.calendar.term1_end) setFormData(prev => ({ ...prev, term1_end: saved.calendar.term1_end }));
          if (saved.calendar.term2_start) setFormData(prev => ({ ...prev, term2_start: saved.calendar.term2_start }));
          if (saved.calendar.term2_end) setFormData(prev => ({ ...prev, term2_end: saved.calendar.term2_end }));
          if (saved.calendar.term3_start) setFormData(prev => ({ ...prev, term3_start: saved.calendar.term3_start }));
          if (saved.calendar.term3_end) setFormData(prev => ({ ...prev, term3_end: saved.calendar.term3_end }));
        }
        
        // Override with term_dates if available
        if (termDates && Array.isArray(termDates)) {
          termDates.forEach((td: any) => {
            if (td.term === 1) {
              setFormData(prev => ({ ...prev, term1_start: td.start_date, term1_end: td.end_date }));
            } else if (td.term === 2) {
              setFormData(prev => ({ ...prev, term2_start: td.start_date, term2_end: td.end_date }));
            } else if (td.term === 3) {
              setFormData(prev => ({ ...prev, term3_start: td.start_date, term3_end: td.end_date }));
            }
          });
        }
        
        // Load holidays
        if (savedHolidays && Array.isArray(savedHolidays)) {
          setHolidays(savedHolidays.map((h: any) => ({ date: h.date, name: h.name })));
        } else if (saved.calendar?.holidays) {
          setHolidays(saved.calendar.holidays);
        }
      } catch (error) {
      }
    };
    loadSettings();
  }, []);

  const addHoliday = () => {
    if (newHoliday.date && newHoliday.name) {
      setHolidays([...holidays, newHoliday]);
      setNewHoliday({date: '', name: ''});
      toast.success('Holiday added');
    }
  };

  const removeHoliday = (index: number) => {
    setHolidays(holidays.filter((_, i) => i !== index));
    toast.success('Holiday removed');
  };

  const handleSaveClick = async () => {
    setLoading(true);
    try {
      // Save to school settings
      await onSave('calendar', { ...formData, holidays });
      
      // Also save term dates to term_dates table for system use
      if (formData.term1_start && formData.term1_end) {
        await api.post('/term-dates', {
          term: 1,
          start_date: formData.term1_start,
          end_date: formData.term1_end,
          year: new Date().getFullYear()
        });
      }
      if (formData.term2_start && formData.term2_end) {
        await api.post('/term-dates', {
          term: 2,
          start_date: formData.term2_start,
          end_date: formData.term2_end,
          year: new Date().getFullYear()
        });
      }
      if (formData.term3_start && formData.term3_end) {
        await api.post('/term-dates', {
          term: 3,
          start_date: formData.term3_start,
          end_date: formData.term3_end,
          year: new Date().getFullYear()
        });
      }
      
      // Save holidays to calendar/holidays table
      for (const holiday of holidays) {
        await api.post('/calendar/holidays', {
          date: holiday.date,
          name: holiday.name
        }).catch(() => {}); // Ignore duplicates
      }
      
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Calendar & Terms</h3>
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Term 1</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input type="date" value={formData.term1_start} onChange={(e) => setFormData({...formData, term1_start: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input type="date" value={formData.term1_end} onChange={(e) => setFormData({...formData, term1_end: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Term 2</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input type="date" value={formData.term2_start} onChange={(e) => setFormData({...formData, term2_start: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input type="date" value={formData.term2_end} onChange={(e) => setFormData({...formData, term2_end: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Term 3</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input type="date" value={formData.term3_start} onChange={(e) => setFormData({...formData, term3_start: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input type="date" value={formData.term3_end} onChange={(e) => setFormData({...formData, term3_end: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-gray-900">Public Holidays (Uganda)</h4>
            <span className="text-sm text-gray-500">{holidays.length} holidays</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {holidays.map((holiday, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{holiday.name}</p>
                  <p className="text-xs text-gray-500">{new Date(holiday.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeHoliday(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-3">Add Custom Holiday</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Date"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Holiday name"
                />
                <button
                  type="button"
                  onClick={addHoliday}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="button"
            disabled={loading} 
            onClick={() => {
              handleSaveClick();
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationsSection({ onSave }: any) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    email_attendance: true,
    email_fees: true,
    email_results: true,
    sms_attendance: false,
    sms_fees: false
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/school-settings');
        if (response.data.notifications) {
          setSettings(response.data.notifications);
        }
      } catch (error) {
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave('notifications', settings);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Notification Settings</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Email Notifications</h4>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.email_attendance} onChange={(e) => setSettings({...settings, email_attendance: e.target.checked})} className="rounded" />
            <span className="text-sm text-gray-700">Attendance alerts</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.email_fees} onChange={(e) => setSettings({...settings, email_fees: e.target.checked})} className="rounded" />
            <span className="text-sm text-gray-700">Fee payment notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.email_results} onChange={(e) => setSettings({...settings, email_results: e.target.checked})} className="rounded" />
            <span className="text-sm text-gray-700">Exam results published</span>
          </label>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">SMS Notifications</h4>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.sms_attendance} onChange={(e) => setSettings({...settings, sms_attendance: e.target.checked})} className="rounded" />
            <span className="text-sm text-gray-700">Attendance alerts</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.sms_fees} onChange={(e) => setSettings({...settings, sms_fees: e.target.checked})} className="rounded" />
            <span className="text-sm text-gray-700">Fee payment reminders</span>
          </label>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SecuritySection({ onSave }: any) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    session_timeout: 30,
    require_2fa: false,
    password_expiry: false,
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/school-settings');
        if (response.data.security) {
          setSettings(prev => ({ ...prev, ...response.data.security, current_password: '', new_password: '', confirm_password: '' }));
        }
      } catch (error) {
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave('security', settings);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
          <input type="number" value={settings.session_timeout} onChange={(e) => setSettings({...settings, session_timeout: parseInt(e.target.value)})} min={5} max={120} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.require_2fa} onChange={(e) => setSettings({...settings, require_2fa: e.target.checked})} className="rounded" />
            <span className="text-sm text-gray-700">Require two-factor authentication for admins</span>
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.password_expiry} onChange={(e) => setSettings({...settings, password_expiry: e.target.checked})} className="rounded" />
            <span className="text-sm text-gray-700">Require password change every 90 days</span>
          </label>
        </div>
        <div className="border-t pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Change Password</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <input type="password" value={settings.current_password} onChange={(e) => setSettings({...settings, current_password: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input type="password" value={settings.new_password} onChange={(e) => setSettings({...settings, new_password: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input type="password" value={settings.confirm_password} onChange={(e) => setSettings({...settings, confirm_password: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
