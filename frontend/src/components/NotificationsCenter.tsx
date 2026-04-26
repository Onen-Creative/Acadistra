'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Badge,
  Paper,
  Group,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Alert,
} from '@mantine/core';
import { IconBell, IconX, IconAlertCircle } from '@tabler/icons-react';
import api from '@/services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationsCenterProps {
  opened: boolean;
  onClose: () => void;
}

export default function NotificationsCenter({ opened, onClose }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (opened) {
      fetchNotifications();
    }
  }, [opened]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/user-notifications');
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/user-notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Kampala', // Uganda timezone
    });
  };

  const formatRelativeTime = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // If date is in the future by more than 5 minutes (clock skew tolerance)
    if (diffMs < -300000) {
      return formatDate(dateString);
    }
    
    // Treat small negative differences as "Just now" (clock skew)
    const absDiffMs = Math.abs(diffMs);
    const diffSecs = Math.floor(absDiffMs / 1000);
    const diffMins = Math.floor(absDiffMs / 60000);
    const diffHours = Math.floor(absDiffMs / 3600000);
    const diffDays = Math.floor(absDiffMs / 86400000);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return formatDate(dateString);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconBell size={20} />
          <Text fw={600}>Notifications</Text>
          {notifications.filter(n => !n.is_read).length > 0 && (
            <Badge color="red" size="sm">
              {notifications.filter(n => !n.is_read).length} new
            </Badge>
          )}
        </Group>
      }
      size="lg"
    >
      <ScrollArea h={500}>
        {loading ? (
          <Center py="xl">
            <Loader size="lg" />
          </Center>
        ) : notifications.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            No notifications yet. You'll see announcements and updates here.
          </Alert>
        ) : (
          <Stack gap="sm">
            {notifications.map((notification) => (
              <Paper
                key={notification.id}
                p="md"
                withBorder
                style={{
                  backgroundColor: notification.is_read ? 'transparent' : '#f0f9ff',
                  borderLeft: `4px solid var(--mantine-color-${getPriorityColor(notification.priority)}-6)`,
                }}
              >
                <Group justify="space-between" align="flex-start" mb="xs">
                  <Group gap="xs">
                    <Badge color={getPriorityColor(notification.priority)} size="sm">
                      {notification.priority}
                    </Badge>
                    {!notification.is_read && (
                      <Badge color="blue" size="sm">New</Badge>
                    )}
                  </Group>
                  <Group gap="xs">
                    <Tooltip label={formatDate(notification.created_at)}>
                      <Text size="xs" c="dimmed">
                        {formatRelativeTime(notification.created_at)}
                      </Text>
                    </Tooltip>
                    {!notification.is_read && (
                      <Tooltip label="Mark as read">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>
                <Text fw={600} size="sm" mb="xs">
                  {notification.title}
                </Text>
                <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                  {notification.message}
                </Text>
              </Paper>
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Modal>
  );
}
