'use client';

import { useState } from 'react';
import {
  Button,
  Modal,
  TextInput,
  Textarea,
  Stack,
  Alert,
} from '@mantine/core';
import { IconAlertTriangle, IconSend } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import api from '@/services/api';

export default function QuickAnnouncementButton() {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const sendQuick = async () => {
    if (!title || !message) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill in all fields',
        color: 'red',
      });
      return;
    }

    setLoading(true);

    try {
      // Create announcement targeting all staff
      const createResponse = await api.post('/announcements', {
        title,
        message,
        target_roles: ['teacher', 'school_admin', 'bursar', 'librarian', 'nurse', 'dos'],
        priority: 'urgent',
        send_email: true,
      });

      const announcement = createResponse.data;

      // Send immediately
      const sendResponse = await api.post(`/announcements/${announcement.id}/send`);
      const result = sendResponse.data;

      notifications.show({
        title: 'Urgent Announcement Sent!',
        message: `Sent to ${result.total_sent} staff members`,
        color: 'green',
      });

      setOpened(false);
      setTitle('');
      setMessage('');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to send announcement',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        color="red"
        leftSection={<IconAlertTriangle size={16} />}
        onClick={() => setOpened(true)}
      >
        Send Urgent Announcement
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Send Urgent Announcement"
        size="lg"
      >
        <Stack gap="md">
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            This will immediately send an urgent notification to all staff members (teachers, admins, bursar, librarian, nurse, DOS).
          </Alert>

          <TextInput
            label="Title"
            placeholder="e.g., URGENT: System Issue"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            label="Message"
            placeholder="Enter urgent message..."
            required
            minRows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <Button
            onClick={sendQuick}
            loading={loading}
            fullWidth
            color="red"
            size="lg"
            leftSection={<IconSend size={16} />}
          >
            Send to All Staff
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
