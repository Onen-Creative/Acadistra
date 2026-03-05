'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Title, Paper, Table, Group, Select, TextInput, Badge, Tabs } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import api from '@/services/api';

export default function SubjectsPage() {
  const [selectedLevel, setSelectedLevel] = useState('');
  const [search, setSearch] = useState('');

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subjects', selectedLevel],
    queryFn: async () => {
      const res = await api.get('/subjects', { params: { level: selectedLevel } });
      return res.data;
    }
  });

  const { data: levels } = useQuery({
    queryKey: ['subject-levels'],
    queryFn: async () => {
      const res = await api.get('/subjects/levels');
      return res.data;
    }
  });

  const filteredSubjects = subjects?.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByLevel = filteredSubjects?.reduce((acc: any, subject: any) => {
    if (!acc[subject.level]) acc[subject.level] = [];
    acc[subject.level].push(subject);
    return acc;
  }, {});

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Subjects</Title>
      </Group>

      <Paper p="md" mb="xl">
        <Group>
          <Select
            label="Filter by Level"
            placeholder="All levels"
            data={[
              { value: '', label: 'All Levels' },
              { value: 'Nursery', label: 'Nursery' },
              { value: 'P1', label: 'P1' },
              { value: 'P2', label: 'P2' },
              { value: 'P3', label: 'P3' },
              { value: 'P4', label: 'P4' },
              { value: 'P5', label: 'P5' },
              { value: 'P6', label: 'P6' },
              { value: 'P7', label: 'P7' },
              { value: 'S1', label: 'S1' },
              { value: 'S2', label: 'S2' },
              { value: 'S3', label: 'S3' },
              { value: 'S4', label: 'S4' },
              { value: 'S5', label: 'S5' },
              { value: 'S6', label: 'S6' },
            ]}
            value={selectedLevel}
            onChange={(val) => setSelectedLevel(val || '')}
            style={{ flex: 1 }}
          />
          <TextInput
            label="Search"
            placeholder="Search subjects..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
        </Group>
      </Paper>

      {selectedLevel ? (
        <Paper p="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Level</Table.Th>
                <Table.Th>Papers</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredSubjects?.map((subject: any) => (
                <Table.Tr key={subject.id}>
                  <Table.Td><Badge variant="light">{subject.code}</Badge></Table.Td>
                  <Table.Td>{subject.name}</Table.Td>
                  <Table.Td>{subject.level}</Table.Td>
                  <Table.Td>{subject.papers}</Table.Td>
                  <Table.Td>{subject.grading_type}</Table.Td>
                  <Table.Td>
                    <Badge color={subject.is_compulsory ? 'blue' : 'gray'}>
                      {subject.is_compulsory ? 'Compulsory' : 'Elective'}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      ) : (
        <Tabs defaultValue="primary">
          <Tabs.List>
            <Tabs.Tab value="primary">Primary</Tabs.Tab>
            <Tabs.Tab value="secondary">Secondary</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="primary" pt="xl">
            {Object.entries(groupedByLevel || {})
              .filter(([level]) => level.startsWith('P') || level === 'Nursery')
              .map(([level, subjects]: [string, any]) => (
                <Paper key={level} p="md" mb="md">
                  <Title order={4} mb="md">{level}</Title>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Papers</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {subjects.map((subject: any) => (
                        <Table.Tr key={subject.id}>
                          <Table.Td><Badge variant="light">{subject.code}</Badge></Table.Td>
                          <Table.Td>{subject.name}</Table.Td>
                          <Table.Td>{subject.papers}</Table.Td>
                          <Table.Td>
                            <Badge color={subject.is_compulsory ? 'blue' : 'gray'}>
                              {subject.is_compulsory ? 'Compulsory' : 'Elective'}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Paper>
              ))}
          </Tabs.Panel>

          <Tabs.Panel value="secondary" pt="xl">
            {Object.entries(groupedByLevel || {})
              .filter(([level]) => level.startsWith('S'))
              .map(([level, subjects]: [string, any]) => (
                <Paper key={level} p="md" mb="md">
                  <Title order={4} mb="md">{level}</Title>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Papers</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {subjects.map((subject: any) => (
                        <Table.Tr key={subject.id}>
                          <Table.Td><Badge variant="light">{subject.code}</Badge></Table.Td>
                          <Table.Td>{subject.name}</Table.Td>
                          <Table.Td>{subject.papers}</Table.Td>
                          <Table.Td>
                            <Badge color={subject.is_compulsory ? 'blue' : 'gray'}>
                              {subject.is_compulsory ? 'Compulsory' : 'Elective'}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Paper>
              ))}
          </Tabs.Panel>
        </Tabs>
      )}
    </Container>
  );
}
