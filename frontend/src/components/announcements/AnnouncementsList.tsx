'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Badge,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  Modal,
  Stack,
  Button,
  Alert,
  Loader,
  Center,
  Paper,
} from '@mantine/core';
import { IconEye, IconTrash, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import api from '@/services/api';

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_roles: { roles: string[] };
  priority: string;
  status: string;
  total_sent: number;
  total_failed: number;
  created_at: string;
  sent_at?: string;
}

export default function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/announcements');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch announcements',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/announcements/${id}`);
      notifications.show({
        title: 'Success',
        message: 'Announcement deleted successfully',
        color: 'green',
      });
      fetchAnnouncements();
      setDeleteModalOpen(false);
      setSelectedAnnouncement(null);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to delete announcement',
        color: 'red',
      });
    } finally {
      setDeletingId(null);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'green';
      case 'draft': return 'gray';
      case 'sending': return 'yellow';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (announcements.length === 0) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="blue">
        No announcements yet. Create your first announcement to notify users about updates.
      </Alert>
    );
  }

  return (
    <>
      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Priority</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Sent</Table.Th>
              <Table.Th>Failed</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {announcements.map((announcement) => (
              <Table.Tr key={announcement.id}>
                <Table.Td>
                  <div>
                    <Text fw={500} size="sm">{announcement.title}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {announcement.message}
                    </Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Badge color={getPriorityColor(announcement.priority)} size="sm">
                    {announcement.priority}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(announcement.status)} size="sm">
                    {announcement.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500} c="green">
                    {announcement.total_sent}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500} c={announcement.total_failed > 0 ? 'red' : 'dimmed'}>
                    {announcement.total_failed}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">
                    {formatDate(announcement.sent_at || announcement.created_at)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="View Details">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => setSelectedAnnouncement(announcement)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                    {announcement.status === 'draft' && (
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setSelectedAnnouncement(announcement);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={selectedAnnouncement !== null && !deleteModalOpen}
        onClose={() => setSelectedAnnouncement(null)}
        title="Announcement Details"
        size="lg"
      >
        {selectedAnnouncement && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">Title</Text>
              <Text fw={500}>{selectedAnnouncement.title}</Text>
            </div>

            <div>
              <Text size="sm" c="dimmed">Message</Text>
              <Paper p="md" withBorder style={{ whiteSpace: 'pre-wrap' }}>
                {selectedAnnouncement.message}
              </Paper>
            </div>

            <Group>
              <div>
                <Text size="sm" c="dimmed">Priority</Text>
                <Badge color={getPriorityColor(selectedAnnouncement.priority)} size="lg" mt={4}>
                  {selectedAnnouncement.priority}
                </Badge>
              </div>

              <div>
                <Text size="sm" c="dimmed">Status</Text>
                <Badge color={getStatusColor(selectedAnnouncement.status)} size="lg" mt={4}>
                  {selectedAnnouncement.status}
                </Badge>
              </div>
            </Group>

            <div>
              <Text size="sm" c="dimmed">Target Roles</Text>
              <Group gap="xs" mt={4}>
                {selectedAnnouncement.target_roles.roles.map((role) => (
                  <Badge key={role} variant="light">
                    {role}
                  </Badge>
                ))}
              </Group>
            </div>

            <Group grow>
              <Paper p="md" withBorder>
                <Text size="sm" c="dimmed">Emails Sent</Text>
                <Text size="xl" fw={700} c="green">
                  {selectedAnnouncement.total_sent}
                </Text>
              </Paper>

              <Paper p="md" withBorder>
                <Text size="sm" c="dimmed">Failed</Text>
                <Text size="xl" fw={700} c={selectedAnnouncement.total_failed > 0 ? 'red' : 'dimmed'}>
                  {selectedAnnouncement.total_failed}
                </Text>
              </Paper>
            </Group>

            <div>
              <Text size="sm" c="dimmed">
                {selectedAnnouncement.sent_at ? 'Sent At' : 'Created At'}
              </Text>
              <Text size="sm">
                {formatDate(selectedAnnouncement.sent_at || selectedAnnouncement.created_at)}
              </Text>
            </div>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedAnnouncement(null);
        }}
        title="Delete Announcement"
      >
        <Stack gap="md">
          <Text>Are you sure you want to delete this announcement?</Text>
          {selectedAnnouncement && (
            <Paper p="md" withBorder>
              <Text fw={500}>{selectedAnnouncement.title}</Text>
            </Paper>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedAnnouncement(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={deletingId === selectedAnnouncement?.id}
              onClick={() => selectedAnnouncement && handleDelete(selectedAnnouncement.id)}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
