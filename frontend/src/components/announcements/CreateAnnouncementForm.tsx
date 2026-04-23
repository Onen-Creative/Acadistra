'use client';

import { useState } from 'react';
import {
  TextInput,
  Textarea,
  MultiSelect,
  Select,
  Button,
  Stack,
  Group,
  Alert,
  Switch,
  Paper,
  Text,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconSend } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import api from '@/services/api';
import TemplatesSelector from './TemplatesSelector';

interface CreateAnnouncementFormProps {
  onSuccess?: () => void;
}

export default function CreateAnnouncementForm({ onSuccess }: CreateAnnouncementFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_roles: [] as string[],
    priority: 'normal',
    send_email: true,
  });

  const roleOptions = [
    { value: 'system_admin', label: 'System Administrators' },
    { value: 'school_admin', label: 'School Administrators' },
    { value: 'teacher', label: 'Teachers' },
    { value: 'bursar', label: 'Bursars' },
    { value: 'librarian', label: 'Librarians' },
    { value: 'nurse', label: 'Nurses' },
    { value: 'parent', label: 'Parents' },
    { value: 'dos', label: 'Director of Studies' },
    { value: 'storekeeper', label: 'Storekeepers' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const handleTemplateSelect = (template: any) => {
    setFormData({
      ...formData,
      title: template.title,
      message: template.message,
      priority: template.priority,
      target_roles: template.target_roles,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.target_roles.length === 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select at least one target role',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setLoading(true);

    try {
      const createResponse = await api.post('/announcements', formData);
      const announcement = createResponse.data;

      notifications.show({
        title: 'Announcement Created',
        message: 'Sending emails...',
        color: 'blue',
        icon: <IconCheck size={16} />,
      });

      const sendResponse = await api.post(`/announcements/${announcement.id}/send`);
      const result = sendResponse.data;

      notifications.show({
        title: 'Announcement Sent!',
        message: `Successfully sent to ${result.total_sent} users. ${result.total_failed} failed.`,
        color: 'green',
        icon: <IconCheck size={16} />,
        autoClose: 5000,
      });

      setFormData({
        title: '',
        message: '',
        target_roles: [],
        priority: 'normal',
        send_email: true,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error:', error);
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to send announcement',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'gray';
      default: return 'blue';
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          Create and send announcements to notify users about system updates, maintenance, or important information.
        </Alert>

        <Group justify="flex-end">
          <TemplatesSelector onSelect={handleTemplateSelect} />
        </Group>

        <TextInput
          label="Title"
          placeholder="e.g., System Maintenance Notice"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          description="A clear, concise title for your announcement"
        />

        <Textarea
          label="Message"
          placeholder="Enter your announcement message here..."
          required
          minRows={6}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          description="The full message that will be sent to users"
        />

        <MultiSelect
          label="Target Roles"
          placeholder="Select who should receive this announcement"
          data={roleOptions}
          required
          value={formData.target_roles}
          onChange={(value) => setFormData({ ...formData, target_roles: value })}
          description="Select one or more user roles to notify"
          searchable
        />

        <Select
          label="Priority"
          data={priorityOptions}
          value={formData.priority}
          onChange={(value) => setFormData({ ...formData, priority: value || 'normal' })}
          description="Priority level affects email styling and urgency"
        />

        <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Email Preview</Text>
              <Text size="xs" c="dimmed">
                Priority: <span style={{ color: getPriorityColor(formData.priority), fontWeight: 600 }}>
                  {formData.priority.toUpperCase()}
                </span>
              </Text>
              <Text size="xs" c="dimmed">
                Recipients: {formData.target_roles.length > 0 
                  ? formData.target_roles.map(r => roleOptions.find(o => o.value === r)?.label).join(', ')
                  : 'None selected'}
              </Text>
            </div>
            <Switch
              label="Send Email"
              checked={formData.send_email}
              onChange={(e) => setFormData({ ...formData, send_email: e.currentTarget.checked })}
            />
          </Group>
        </Paper>

        <Group justify="flex-end" mt="md">
          <Button
            type="submit"
            loading={loading}
            leftSection={<IconSend size={16} />}
            size="lg"
            color={getPriorityColor(formData.priority)}
          >
            Send Announcement
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
