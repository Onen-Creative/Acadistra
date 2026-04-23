'use client';

import { useState, useEffect } from 'react';
import { SimpleGrid, Paper, Text, Group, ThemeIcon, RingProgress } from '@mantine/core';
import { IconBell, IconCheck, IconX, IconClock } from '@tabler/icons-react';
import api from '@/services/api';

interface Stats {
  total: number;
  sent: number;
  draft: number;
  failed: number;
}

export default function AnnouncementStats() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    sent: 0,
    draft: 0,
    failed: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/announcements');
      const announcements = response.data;

      const sent = announcements.filter((a: any) => a.status === 'sent').length;
      const draft = announcements.filter((a: any) => a.status === 'draft').length;
      const totalFailed = announcements.reduce((sum: number, a: any) => sum + (a.total_failed || 0), 0);

      setStats({
        total: announcements.length,
        sent,
        draft,
        failed: totalFailed,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Announcements',
      value: stats.total,
      icon: IconBell,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Successfully Sent',
      value: stats.sent,
      icon: IconCheck,
      color: 'green',
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      title: 'Draft',
      value: stats.draft,
      icon: IconClock,
      color: 'gray',
      gradient: 'from-gray-500 to-gray-600',
    },
    {
      title: 'Failed Emails',
      value: stats.failed,
      icon: IconX,
      color: 'red',
      gradient: 'from-red-500 to-red-600',
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
      {statCards.map((stat) => (
        <Paper 
          key={stat.title} 
          p="lg" 
          shadow="md" 
          radius="lg"
          className="border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
        >
          <Group justify="space-between" align="flex-start">
            <div className="flex-1">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">
                {stat.title}
              </Text>
              <Text size="2rem" fw={700} className="bg-gradient-to-r {stat.gradient} bg-clip-text text-transparent">
                {stat.value}
              </Text>
            </div>
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon size={24} className="text-white" />
            </div>
          </Group>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
