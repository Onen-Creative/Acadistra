'use client';

import { useState, useEffect } from 'react';
import { Card, Text, Badge, Button, Group, Stack, TextInput, Textarea, Select, Table, Modal, ActionIcon, NumberInput, Loader } from '@mantine/core';
import { IconSend, IconTemplate, IconSettings, IconHistory, IconUsers, IconRefresh, IconPlus, IconCash, IconBell, IconMessageCircle, IconClock, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { smsService, SMSProvider, SMSTemplate, SMSQueue, SMSBatch, SMSLog } from '@/services/sms';
import { studentsApi, feesApi, schoolsApi, classesApi } from '@/services/api';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function SMSPage() {
  const [activeView, setActiveView] = useState('send');
  const [provider, setProvider] = useState<SMSProvider | null>(null);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [queue, setQueue] = useState<SMSQueue[]>([]);
  const [batches, setBatches] = useState<SMSBatch[]>([]);
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState<any>(null);

  // Send SMS form
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Fees reminder form - dynamic
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentFees, setStudentFees] = useState<any>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingFees, setLoadingFees] = useState(false);

  // Bulk fees reminder
  const [bulkFeesData, setBulkFeesData] = useState<any[]>([]);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [minBalance, setMinBalance] = useState<number>(0);

  // Provider config modal
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerForm, setProviderForm] = useState({
    provider: 'africastalking',
    api_key: '',
    api_secret: '',
    username: '',
    sender_id: '',
  });

  // Template modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'general',
    template: '',
  });

  useEffect(() => {
    loadData();
    loadSchool();
    loadClasses();
  }, [activeView]);

  const loadSchool = async () => {
    try {
      const schoolData = await schoolsApi.getMySchool();
      setSchool(schoolData);
    } catch (error: any) {
      console.error('Failed to load school data:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const classesData = await classesApi.list();
      setClasses(classesData.classes || []);
    } catch (error: any) {
      console.error('Failed to load classes:', error);
    }
  };

  const loadData = async () => {
    try {
      if (activeView === 'send' || activeView === 'templates' || activeView === 'fees-reminder') {
        const [providerData, templatesData] = await Promise.all([
          smsService.getProvider().catch(() => null),
          smsService.getTemplates(),
        ]);
        setProvider(providerData);
        setTemplates(templatesData);
      }

      if (activeView === 'queue') {
        const queueData = await smsService.getQueue();
        setQueue(queueData);
      }

      if (activeView === 'batches') {
        const batchesData = await smsService.getBatches();
        setBatches(batchesData);
      }

      if (activeView === 'logs') {
        const logsData = await smsService.getLogs();
        setLogs(logsData);
      }

      if (activeView === 'stats') {
        const statsData = await smsService.getStats();
        setStats(statsData);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to load data',
        color: 'red',
      });
    }
  };

  const handleSendFeesReminder = async () => {
    if (!selectedStudent || !studentFees) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a student and load their fees information',
        color: 'red',
      });
      return;
    }

    // Get primary guardian or first guardian with phone
    const guardian = selectedStudent.guardians?.find((g: any) => g.is_primary_contact) || 
                     selectedStudent.guardians?.find((g: any) => g.phone) ||
                     selectedStudent.guardians?.[0];

    if (!guardian?.phone) {
      notifications.show({
        title: 'Validation Error',
        message: 'Student does not have a guardian phone number on record',
        color: 'red',
      });
      return;
    }

    const outstandingBalance = studentFees.outstanding;
    if (outstandingBalance <= 0) {
      notifications.show({
        title: 'No Outstanding Balance',
        message: 'This student has no outstanding fees',
        color: 'yellow',
      });
      return;
    }

    const schoolInfo = school?.name ? `${school.name}\n` : '';
    const guardianName = guardian.full_name || 'Parent/Guardian';
    const studentName = `${selectedStudent.first_name} ${selectedStudent.last_name}`;
    const className = selectedStudent.class_name || '';
    const classInfo = className ? ` (${className})` : '';
    
    const feesMessage = `${schoolInfo}Dear ${guardianName},\n\nThis is a reminder that ${studentName}${classInfo} has an outstanding school fees balance of UGX ${outstandingBalance.toLocaleString()}.\n\nPlease make payment at your earliest convenience.\n\nThank you.`;

    setLoading(true);
    try {
      await smsService.sendSMS({
        phone_number: guardian.phone,
        message: feesMessage,
        category: 'fees',
        recipient_type: 'parent',
        recipient_id: guardian.id,
      });

      notifications.show({
        title: 'Success',
        message: 'Fees reminder SMS queued successfully',
        color: 'green',
      });

      // Reset form
      setSelectedStudent(null);
      setStudentFees(null);
      setStudentSearch('');
      setSearchResults([]);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to send SMS',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchStudents = async () => {
    if (!studentSearch.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please enter a student name or admission number',
        color: 'red',
      });
      return;
    }

    setLoadingStudent(true);
    try {
      const response = await studentsApi.list({ search: studentSearch, limit: 10 });
      const students = response.students || [];
      setSearchResults(students);
      
      if (students.length === 0) {
        notifications.show({
          title: 'No Results',
          message: 'No students found matching your search',
          color: 'yellow',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to search students',
        color: 'red',
      });
    } finally {
      setLoadingStudent(false);
    }
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setStudentSearch(`${student.first_name} ${student.last_name} (${student.admission_number || student.admission_no})`);
    
    // Load student fees
    setLoadingFees(true);
    try {
      const feesData = await feesApi.list();
      
      // Filter fees for this student and calculate totals
      const fees = (feesData.fees || []).filter((fee: any) => fee.student_id === student.id);
      const totalFees = fees.reduce((sum: number, fee: any) => sum + (fee.total_fees || 0), 0);
      const totalPaid = fees.reduce((sum: number, fee: any) => sum + (fee.amount_paid || 0), 0);
      const outstanding = fees.reduce((sum: number, fee: any) => sum + (fee.outstanding || 0), 0);
      
      setStudentFees({
        fees,
        total_fees: totalFees,
        total_paid: totalPaid,
        outstanding: outstanding,
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to load student fees',
        color: 'red',
      });
      setStudentFees(null);
    } finally {
      setLoadingFees(false);
    }
  };

  const handleLoadBulkFeesData = async () => {
    setLoadingBulk(true);
    try {
      // First, get all fees records with outstanding balances
      const feesParams: any = {};
      if (selectedClass) {
        feesParams.class_id = selectedClass;
      }
      
      const feesData = await feesApi.list(feesParams);
      const allFeesRecords = feesData.fees || [];
      
      // Group fees by student_id and calculate totals
      const studentFeesMap = new Map();
      
      for (const fee of allFeesRecords) {
        const studentId = fee.student_id;
        if (!studentFeesMap.has(studentId)) {
          studentFeesMap.set(studentId, {
            total_fees: 0,
            total_paid: 0,
            outstanding: 0,
            records: [],
          });
        }
        
        const studentFees = studentFeesMap.get(studentId);
        studentFees.total_fees += fee.total_fees || 0;
        studentFees.total_paid += fee.amount_paid || 0;
        studentFees.outstanding += fee.outstanding || 0;
        studentFees.records.push(fee);
      }
      
      // Now load student details for those with outstanding fees
      const studentsWithBalance = [];
      
      for (const [studentId, feesInfo] of studentFeesMap.entries()) {
        if (feesInfo.outstanding > minBalance) {
          try {
            const studentData = await studentsApi.get(studentId);
            const student = studentData.student;
            
            // Get class name from active enrollment
            let className = 'N/A';
            if (student.enrollments && student.enrollments.length > 0) {
              const activeEnrollment = student.enrollments.find((e: any) => e.status === 'active');
              if (activeEnrollment?.class) {
                className = `${activeEnrollment.class.name}`;
              }
            }
            
            // Get guardian with phone
            const guardian = student.guardians?.find((g: any) => g.is_primary_contact) || 
                            student.guardians?.find((g: any) => g.phone) ||
                            student.guardians?.[0];
            
            if (guardian?.phone) {
              studentsWithBalance.push({
                student: {
                  ...student,
                  full_name: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.replace(/\s+/g, ' ').trim(),
                  class_name: className,
                },
                guardian,
                total_fees: feesInfo.total_fees,
                total_paid: feesInfo.total_paid,
                outstanding: feesInfo.outstanding,
                fee_records: feesInfo.records,
              });
            }
          } catch (error) {
            console.error(`Failed to load student ${studentId}:`, error);
          }
        }
      }
      
      setBulkFeesData(studentsWithBalance);
      
      if (studentsWithBalance.length === 0) {
        notifications.show({
          title: 'No Students Found',
          message: 'No students with outstanding fees and guardian phone numbers found',
          color: 'yellow',
        });
      } else {
        notifications.show({
          title: 'Success',
          message: `Found ${studentsWithBalance.length} students with outstanding fees`,
          color: 'green',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to load bulk fees data',
        color: 'red',
      });
    } finally {
      setLoadingBulk(false);
    }
  };

  const handleSendBulkFeesReminder = async () => {
    if (bulkFeesData.length === 0) {
      notifications.show({
        title: 'No Data',
        message: 'Please load students with outstanding fees first',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const schoolInfo = school?.name ? `${school.name}\n` : '';
      
      const recipients = bulkFeesData.map((item) => {
        const guardianName = item.guardian.full_name || 'Parent/Guardian';
        const studentName = item.student.full_name;
        const className = item.student.class_name || '';
        const classInfo = className ? ` (${className})` : '';
        
        const message = `${schoolInfo}Dear ${guardianName},\n\nThis is a reminder that ${studentName}${classInfo} has an outstanding school fees balance of UGX ${item.outstanding.toLocaleString()}.\n\nPlease make payment at your earliest convenience.\n\nThank you.`;
        
        return {
          recipient_id: item.guardian.id,
          recipient_type: 'parent',
          phone_number: item.guardian.phone,
          message: message,
          variables: {
            guardian_name: guardianName,
            student_name: studentName,
            class_name: className,
            outstanding_balance: item.outstanding,
          },
        };
      });

      // Send each SMS individually through the bulk endpoint
      const bulkRequests = recipients.map(recipient => 
        smsService.sendSMS({
          recipient_id: recipient.recipient_id,
          recipient_type: recipient.recipient_type,
          phone_number: recipient.phone_number,
          message: recipient.message,
          category: 'fees',
        })
      );

      await Promise.all(bulkRequests);

      notifications.show({
        title: 'Success',
        message: `Bulk fees reminder queued for ${recipients.length} parents`,
        color: 'green',
      });

      // Reset
      setBulkFeesData([]);
      setSelectedClass('');
      setMinBalance(0);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to send bulk SMS',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!phoneNumber || !message) {
      notifications.show({
        title: 'Validation Error',
        message: 'Phone number and message are required',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await smsService.sendSMS({
        phone_number: phoneNumber,
        message,
        category,
        recipient_type: 'manual',
      });

      notifications.show({
        title: 'Success',
        message: 'SMS queued successfully',
        color: 'green',
      });

      setPhoneNumber('');
      setMessage('');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to send SMS',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureProvider = async () => {
    setLoading(true);
    try {
      await smsService.configureProvider(providerForm);
      notifications.show({
        title: 'Success',
        message: 'Provider configured successfully',
        color: 'green',
      });
      setProviderModalOpen(false);
      loadData();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to configure provider',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    setLoading(true);
    try {
      await smsService.createTemplate(templateForm);
      notifications.show({
        title: 'Success',
        message: 'Template created successfully',
        color: 'green',
      });
      setTemplateModalOpen(false);
      setTemplateForm({ name: '', category: 'general', template: '' });
      loadData();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to create template',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template: SMSTemplate) => {
    setMessage(template.template);
    setCategory(template.category);
    setSelectedTemplate(template.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'green';
      case 'failed': return 'red';
      case 'pending': return 'yellow';
      case 'sending': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">SMS Management</h1>
          <p className="text-purple-100">Send messages, manage templates, and track SMS delivery</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Sent</p>
                <p className="text-4xl font-bold mt-2">{stats?.total_sent || 0}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <IconSend className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">In Queue</p>
                <p className="text-4xl font-bold mt-2">{queue.length}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <IconClock className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Templates</p>
                <p className="text-4xl font-bold mt-2">{templates.length}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <IconTemplate className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Provider</p>
                <p className="text-xl font-bold mt-2">{provider?.is_active ? provider.provider : 'Not Set'}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <IconSettings className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {!provider?.is_active && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-center">
              <IconBell className="w-6 h-6 text-yellow-600 mr-3" />
              <div>
                <p className="text-yellow-800 font-medium">SMS provider not configured</p>
                <p className="text-yellow-700 text-sm">Click "Configure Provider" to set up your SMS gateway.</p>
              </div>
              <Button 
                onClick={() => setProviderModalOpen(true)} 
                className="ml-auto"
                variant="light"
                color="yellow"
              >
                Configure Now
              </Button>
            </div>
          </div>
        )}

        {/* Main Content with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <h3 className="font-semibold flex items-center gap-2">
                  <IconMessageCircle size={20} />
                  SMS Actions
                </h3>
              </div>
              <nav className="p-2">
                {[
                  { id: 'send', label: 'Send SMS', icon: IconSend },
                  { id: 'fees-reminder', label: 'Fees Reminder', icon: IconCash },
                  { id: 'bulk-fees-reminder', label: 'Bulk Fees Reminder', icon: IconUsers },
                  { id: 'templates', label: 'Templates', icon: IconTemplate },
                  { id: 'queue', label: 'Queue', icon: IconClock },
                  { id: 'batches', label: 'Batches', icon: IconUsers },
                  { id: 'logs', label: 'History', icon: IconHistory },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activeView === item.id
                          ? 'bg-purple-50 text-purple-700 font-medium shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="p-4 border-t">
                <Button
                  fullWidth
                  leftSection={<IconSettings size={16} />}
                  onClick={() => setProviderModalOpen(true)}
                  variant="light"
                  color="purple"
                >
                  Configure Provider
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Send SMS View */}
              {activeView === 'send' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <IconSend className="text-purple-600" />
                    Send SMS
                  </h2>
                  <Stack gap="md">
                    <TextInput
                      label="Phone Number"
                      placeholder="+256700000000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      size="md"
                    />

                    <Select
                      label="Category"
                      value={category}
                      onChange={(value) => setCategory(value || 'general')}
                      data={[
                        { value: 'general', label: 'General' },
                        { value: 'fees', label: 'Fees' },
                        { value: 'attendance', label: 'Attendance' },
                        { value: 'results', label: 'Results' },
                        { value: 'announcement', label: 'Announcement' },
                        { value: 'alert', label: 'Alert' },
                      ]}
                      size="md"
                    />

                    <Textarea
                      label="Message"
                      placeholder="Type your message here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      minRows={4}
                      maxLength={160}
                      required
                      size="md"
                    />

                    <Text size="sm" c="dimmed">
                      {message.length}/160 characters
                    </Text>

                    <Button
                      leftSection={<IconSend size={16} />}
                      onClick={handleSendSMS}
                      loading={loading}
                      disabled={!provider?.is_active}
                      size="md"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Send SMS
                    </Button>
                  </Stack>

                  {templates.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">Quick Templates</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {templates.slice(0, 5).map((template) => (
                          <div
                            key={template.id}
                            onClick={() => handleUseTemplate(template)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <Text size="sm" fw={500}>{template.name}</Text>
                                <Text size="xs" c="dimmed" lineClamp={1}>{template.template}</Text>
                              </div>
                              <Badge size="sm">{template.category}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fees Reminder View */}
              {activeView === 'fees-reminder' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <IconCash className="text-purple-600" />
                    School Fees Reminder
                  </h2>
                  <Stack gap="md">
                    {/* Student Search */}
                    <div>
                      <Text size="sm" fw={500} mb="xs">Search Student</Text>
                      <Group gap="xs">
                        <TextInput
                          placeholder="Enter student name or admission number"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearchStudents()}
                          style={{ flex: 1 }}
                          size="md"
                        />
                        <Button
                          leftSection={<IconSearch size={16} />}
                          onClick={handleSearchStudents}
                          loading={loadingStudent}
                          size="md"
                        >
                          Search
                        </Button>
                      </Group>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <Text size="sm" fw={500} p="sm" className="bg-gray-50 border-b">
                          Select a student:
                        </Text>
                        <div className="max-h-60 overflow-y-auto">
                          {searchResults.map((student) => {
                            const hasGuardian = student.guardians && student.guardians.length > 0;
                            const hasPhone = hasGuardian && student.guardians.some((g: any) => g.phone);
                            
                            return (
                              <div
                                key={student.id}
                                onClick={() => handleSelectStudent(student)}
                                className="p-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Text size="sm" fw={500}>
                                      {student.first_name} {student.last_name}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {student.admission_no || student.admission_number} • {student.class_name || 'No class'}
                                    </Text>
                                  </div>
                                  {hasPhone && (
                                    <Badge size="sm" color="green">Has Phone</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selected Student Info */}
                    {selectedStudent && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <Text size="sm" fw={500} mb="xs" className="text-blue-900">Selected Student</Text>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Text size="xs" c="dimmed">Student Name</Text>
                            <Text size="sm" fw={500}>{selectedStudent.first_name} {selectedStudent.last_name}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Admission Number</Text>
                            <Text size="sm" fw={500}>{selectedStudent.admission_no || selectedStudent.admission_number}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Class</Text>
                            <Text size="sm" fw={500}>{selectedStudent.class_name || 'N/A'}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Guardian</Text>
                            <Text size="sm" fw={500}>
                              {selectedStudent.guardians?.[0]?.full_name || 'N/A'}
                            </Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Guardian Phone</Text>
                            <Text size="sm" fw={500}>
                              {selectedStudent.guardians?.find((g: any) => g.phone)?.phone || 'N/A'}
                            </Text>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fees Information */}
                    {loadingFees && (
                      <div className="flex items-center justify-center p-8">
                        <Loader size="md" />
                        <Text size="sm" ml="md">Loading fees information...</Text>
                      </div>
                    )}

                    {studentFees && !loadingFees && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <Text size="sm" fw={500} mb="xs" className="text-green-900">Fees Summary</Text>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Text size="xs" c="dimmed">Total Fees</Text>
                            <Text size="lg" fw={700} className="text-green-900">
                              UGX {studentFees.total_fees.toLocaleString()}
                            </Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Amount Paid</Text>
                            <Text size="lg" fw={700} className="text-blue-900">
                              UGX {studentFees.total_paid.toLocaleString()}
                            </Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Outstanding Balance</Text>
                            <Text size="lg" fw={700} className="text-red-900">
                              UGX {studentFees.outstanding.toLocaleString()}
                            </Text>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message Preview */}
                    {selectedStudent && studentFees && (() => {
                      const guardian = selectedStudent.guardians?.find((g: any) => g.is_primary_contact) || 
                                       selectedStudent.guardians?.find((g: any) => g.phone) ||
                                       selectedStudent.guardians?.[0];
                      
                      return (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <Text size="sm" fw={500} mb="xs">Message Preview:</Text>
                          <Text size="sm" className="whitespace-pre-wrap">
                            {school?.name && `${school.name}\n`}
                            Dear {guardian?.full_name || 'Parent/Guardian'},
                            {"\n\n"}
                            This is a reminder that {selectedStudent.first_name} {selectedStudent.last_name}
                            {selectedStudent.class_name && ` (${selectedStudent.class_name})`} has an outstanding school fees balance of UGX {studentFees.outstanding.toLocaleString()}.
                            {"\n\n"}
                            Please make payment at your earliest convenience.
                            {"\n\n"}
                            Thank you.
                          </Text>
                        </div>
                      );
                    })()}

                    <Button
                      leftSection={<IconSend size={16} />}
                      onClick={handleSendFeesReminder}
                      loading={loading}
                      disabled={!provider?.is_active || !selectedStudent || !studentFees || studentFees.outstanding <= 0}
                      size="md"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Send Fees Reminder
                    </Button>
                  </Stack>
                </div>
              )}

              {/* Bulk Fees Reminder View */}
              {activeView === 'bulk-fees-reminder' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <IconUsers className="text-purple-600" />
                    Bulk Fees Reminder
                  </h2>
                  <Stack gap="md">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <Text size="sm" fw={500} className="text-blue-900 mb-2">ℹ️ Information</Text>
                      <Text size="sm" className="text-blue-800">
                        Send fees reminder SMS to all parents whose students have outstanding balances.
                        You can filter by class and minimum balance amount.
                      </Text>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="Filter by Class (Optional)"
                        placeholder="All classes"
                        value={selectedClass}
                        onChange={(value) => setSelectedClass(value || '')}
                        data={[
                          { value: '', label: 'All Classes' },
                          ...classes.map((cls: any) => ({
                            value: cls.id,
                            label: `${cls.name} - ${cls.level}`,
                          })),
                        ]}
                        size="md"
                        clearable
                      />

                      <NumberInput
                        label="Minimum Outstanding Balance (UGX)"
                        placeholder="0"
                        value={minBalance}
                        onChange={(value) => setMinBalance(Number(value) || 0)}
                        min={0}
                        size="md"
                      />
                    </div>

                    <Button
                      leftSection={<IconRefresh size={16} />}
                      onClick={handleLoadBulkFeesData}
                      loading={loadingBulk}
                      size="md"
                      variant="light"
                    >
                      Load Students with Outstanding Fees
                    </Button>

                    {/* Results Table */}
                    {bulkFeesData.length > 0 && (
                      <div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <Text size="sm" fw={500} className="text-green-900">
                            Found {bulkFeesData.length} students with outstanding fees
                          </Text>
                          <Text size="sm" className="text-green-800 mt-1">
                            Total Outstanding: UGX {bulkFeesData.reduce((sum, item) => sum + item.outstanding, 0).toLocaleString()}
                          </Text>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guardian</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Fees</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {bulkFeesData.slice(0, 50).map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <Text size="sm" fw={500}>
                                      {item.student.full_name}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {item.student.admission_no || item.student.admission_number}
                                    </Text>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <Text size="sm">{item.student.class_name || 'N/A'}</Text>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <Text size="sm">{item.guardian.full_name}</Text>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <Text size="sm">{item.guardian.phone}</Text>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <Text size="sm">UGX {item.total_fees.toLocaleString()}</Text>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <Text size="sm">UGX {item.total_paid.toLocaleString()}</Text>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <Text size="sm" fw={700} className="text-red-600">
                                      UGX {item.outstanding.toLocaleString()}
                                    </Text>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {bulkFeesData.length > 50 && (
                          <Text size="sm" c="dimmed" mt="xs">
                            Showing first 50 of {bulkFeesData.length} students. All will receive SMS.
                          </Text>
                        )}

                        <Button
                          leftSection={<IconSend size={16} />}
                          onClick={handleSendBulkFeesReminder}
                          loading={loading}
                          disabled={!provider?.is_active}
                          size="md"
                          className="bg-purple-600 hover:bg-purple-700 mt-4"
                          fullWidth
                        >
                          Send Fees Reminder to {bulkFeesData.length} Parents
                        </Button>
                      </div>
                    )}
                  </Stack>
                </div>
              )}

              {/* Templates View */}
              {activeView === 'templates' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <IconTemplate className="text-purple-600" />
                      SMS Templates
                    </h2>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => setTemplateModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                      Create Template
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {templates.map((template) => (
                          <tr key={template.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm" fw={500}>{template.name}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge>{template.category}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <Text size="sm" lineClamp={1}>{template.template}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge color={template.is_active ? 'green' : 'gray'}>
                                {template.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Queue View */}
              {activeView === 'queue' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <IconClock className="text-purple-600" />
                      SMS Queue
                    </h2>
                    <Button leftSection={<IconRefresh size={16} />} onClick={loadData} variant="light">
                      Refresh
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {queue.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">{item.phone_number}</Text>
                            </td>
                            <td className="px-6 py-4">
                              <Text size="sm" lineClamp={1}>{item.message}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge>{item.category}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge color={getStatusColor(item.status)}>{item.status}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">{item.attempts}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">{new Date(item.created_at).toLocaleString()}</Text>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Batches View */}
              {activeView === 'batches' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <IconUsers className="text-purple-600" />
                      SMS Batches
                    </h2>
                    <Button leftSection={<IconRefresh size={16} />} onClick={loadData} variant="light">
                      Refresh
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {batches.map((batch) => (
                          <tr key={batch.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm" fw={500}>{batch.name}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge>{batch.category}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">{batch.total_count}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">{batch.sent_count}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">{batch.failed_count}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">UGX {batch.total_cost.toLocaleString()}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge color={getStatusColor(batch.status)}>{batch.status}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">{new Date(batch.created_at).toLocaleString()}</Text>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Logs View */}
              {activeView === 'logs' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <IconHistory className="text-purple-600" />
                      SMS History
                    </h2>
                    <Button leftSection={<IconRefresh size={16} />} onClick={loadData} variant="light">
                      Refresh
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">{log.recipient}</Text>
                            </td>
                            <td className="px-6 py-4">
                              <Text size="sm" lineClamp={1}>{log.message}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge>{log.sms_type}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge color={getStatusColor(log.status)}>{log.status}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">UGX {log.cost.toLocaleString()}</Text>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Text size="sm">{log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}</Text>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Provider Configuration Modal */}
        <Modal opened={providerModalOpen} onClose={() => setProviderModalOpen(false)} title="Configure SMS Provider" size="lg">
          <Stack>
            <Select
              label="Provider"
              value={providerForm.provider}
              onChange={(value) => setProviderForm({ ...providerForm, provider: value || 'africastalking' })}
              data={[
                { value: 'africastalking', label: "Africa's Talking" },
                { value: 'twilio', label: 'Twilio' },
              ]}
            />

            <TextInput
              label="API Key"
              value={providerForm.api_key}
              onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
              required
            />

            <TextInput
              label="API Secret"
              value={providerForm.api_secret}
              onChange={(e) => setProviderForm({ ...providerForm, api_secret: e.target.value })}
            />

            <TextInput
              label="Username"
              value={providerForm.username}
              onChange={(e) => setProviderForm({ ...providerForm, username: e.target.value })}
              required
            />

            <TextInput
              label="Sender ID"
              value={providerForm.sender_id}
              onChange={(e) => setProviderForm({ ...providerForm, sender_id: e.target.value })}
            />

            <Group justify="flex-end">
              <Button variant="light" onClick={() => setProviderModalOpen(false)}>Cancel</Button>
              <Button onClick={handleConfigureProvider} loading={loading}>Save Configuration</Button>
            </Group>
          </Stack>
        </Modal>

        {/* Template Creation Modal */}
        <Modal opened={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Create SMS Template" size="lg">
          <Stack>
            <TextInput
              label="Template Name"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              required
            />

            <Select
              label="Category"
              value={templateForm.category}
              onChange={(value) => setTemplateForm({ ...templateForm, category: value || 'general' })}
              data={[
                { value: 'general', label: 'General' },
                { value: 'fees', label: 'Fees' },
                { value: 'attendance', label: 'Attendance' },
                { value: 'results', label: 'Results' },
                { value: 'announcement', label: 'Announcement' },
                { value: 'alert', label: 'Alert' },
              ]}
            />

            <Textarea
              label="Template"
              placeholder="Use {{.VariableName}} for dynamic content"
              value={templateForm.template}
              onChange={(e) => setTemplateForm({ ...templateForm, template: e.target.value })}
              minRows={4}
              required
            />

            <Text size="sm" c="dimmed">
              Example: Dear {`{{.GuardianName}}`}, {`{{.StudentName}}`} was absent on {`{{.Date}}`}.
            </Text>

            <Group justify="flex-end">
              <Button variant="light" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTemplate} loading={loading}>Create Template</Button>
            </Group>
          </Stack>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
