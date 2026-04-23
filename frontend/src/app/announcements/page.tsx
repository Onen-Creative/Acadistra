'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Tabs,
  Group,
  Alert,
  Stack,
  Text,
  Box,
} from '@mantine/core';
import { IconBell, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import CreateAnnouncementForm from '@/components/announcements/CreateAnnouncementForm';
import AnnouncementsList from '@/components/announcements/AnnouncementsList';
import AnnouncementStats from '@/components/announcements/AnnouncementStats';

export default function SchoolAnnouncementsPage() {
  const { user, loading: authLoading } = useRequireAuth(['school_admin']);
  const [activeTab, setActiveTab] = useState<string | null>('create');
  const [refreshKey, setRefreshKey] = useState(0);

  if (authLoading) {
    return (
      <DashboardLayout>
        <Container size="xl" py="xl">
          <div className="flex items-center justify-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0"></div>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== 'school_admin') {
    return (
      <DashboardLayout>
        <Container size="xl" py="xl">
          <Alert icon={<IconAlertCircle size={16} />} title="Access Denied" color="red">
            You do not have permission to access this page.
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  const handleAnnouncementSent = () => {
    setRefreshKey((prev) => prev + 1);
    setActiveTab('history');
  };

  return (
    <DashboardLayout>
      <Container size="xl" py="xl">
        {/* Header Section */}
        <Box mb="xl">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
            <div className="relative z-10">
              <Group gap="md" mb="sm">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <IconBell size={28} className="text-white" />
                </div>
                <div>
                  <Title order={1} className="text-white mb-1">School Announcements</Title>
                  <Text size="sm" className="text-emerald-100">
                    Notify your school staff, teachers, and parents about important updates
                  </Text>
                </div>
              </Group>
            </div>
          </div>
        </Box>

        <Stack gap="lg">
          <AnnouncementStats key={`stats-${refreshKey}`} />

          <Paper shadow="md" radius="lg" className="overflow-hidden border border-gray-100">
            <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
              <Tabs.List className="bg-gradient-to-r from-gray-50 to-emerald-50/30 p-4 border-b border-gray-100">
                <Tabs.Tab 
                  value="create" 
                  leftSection={<IconPlus size={18} />}
                  className="font-semibold"
                >
                  Create Announcement
                </Tabs.Tab>
                <Tabs.Tab 
                  value="history" 
                  leftSection={<IconBell size={18} />}
                  className="font-semibold"
                >
                  History
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="create" pt="xl" px="xl" pb="xl">
                <CreateAnnouncementForm onSuccess={handleAnnouncementSent} />
              </Tabs.Panel>

              <Tabs.Panel value="history" pt="xl" px="xl" pb="xl">
                <AnnouncementsList key={`list-${refreshKey}`} />
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </Stack>
      </Container>
    </DashboardLayout>
  );
}
