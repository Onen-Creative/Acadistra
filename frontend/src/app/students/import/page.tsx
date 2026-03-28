'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Container, Title, Paper, Button, Group, FileInput, Table, Badge, Stepper, Select } from '@mantine/core';
import { IconUpload, IconDownload, IconCheck, IconX } from '@tabler/icons-react';
import api from '@/services/api';
import { notifications } from '@mantine/notifications';

export default function StudentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [active, setActive] = useState(0);
  const [importId, setImportId] = useState('');

  const { data: imports } = useQuery({
    queryKey: ['imports'],
    queryFn: async () => {
      const res = await api.get('/api/v1/import/list');
      return res.data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/v1/import/students/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: 'File uploaded successfully', color: 'green' });
      setImportId(data.import_id);
      setActive(1);
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Upload failed', color: 'red' });
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/import/${id}/approve`),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Import approved', color: 'green' });
      setActive(2);
    }
  });

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://acadistra.com'}/api/v1/import/templates/students?token=${token}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Download failed', color: 'red' });
    }
  };

  const handleUpload = () => {
    if (file) uploadMutation.mutate(file);
  };

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="xl">Bulk Import Students</Title>

      <Paper p="md" mb="xl">
        <Stepper active={active}>
          <Stepper.Step label="Upload" description="Upload Excel file">
            <Group mt="xl">
              <Button leftSection={<IconDownload size={16} />} variant="light" onClick={downloadTemplate}>
                Download Template
              </Button>
              <FileInput
                placeholder="Select Excel file"
                accept=".xlsx,.xls"
                value={file}
                onChange={setFile}
                style={{ flex: 1 }}
              />
              <Button leftSection={<IconUpload size={16} />} onClick={handleUpload} disabled={!file} loading={uploadMutation.isPending}>
                Upload
              </Button>
            </Group>
          </Stepper.Step>

          <Stepper.Step label="Review" description="Review imported data">
            {importId && (
              <Group mt="xl">
                <Button onClick={() => approveMutation.mutate(importId)} loading={approveMutation.isPending}>
                  Approve Import
                </Button>
                <Button variant="outline" color="red">Reject</Button>
              </Group>
            )}
          </Stepper.Step>

          <Stepper.Completed>
            <div className="text-center py-8">
              <IconCheck size={48} className="text-green-600 mx-auto mb-4" />
              <Title order={3}>Import Completed!</Title>
              <Button mt="md" onClick={() => { setActive(0); setFile(null); setImportId(''); }}>
                Import More
              </Button>
            </div>
          </Stepper.Completed>
        </Stepper>
      </Paper>

      <Paper p="md">
        <Title order={4} mb="md">Import History</Title>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>File</Table.Th>
              <Table.Th>Records</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array.isArray(imports) && imports.map((imp: any) => (
              <Table.Tr key={imp.id}>
                <Table.Td>{new Date(imp.created_at).toLocaleDateString()}</Table.Td>
                <Table.Td>{imp.file_name}</Table.Td>
                <Table.Td>{imp.total_records}</Table.Td>
                <Table.Td>
                  <Badge color={imp.status === 'completed' ? 'green' : imp.status === 'pending' ? 'yellow' : 'red'}>
                    {imp.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light">View Details</Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Container>
  );
}
