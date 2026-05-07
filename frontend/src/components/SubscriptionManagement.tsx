'use client'

import { useState, useEffect } from 'react';
import { Card, Badge, Table, Text, Group, Stack, Checkbox } from '@mantine/core';

interface Module {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface ModuleSelectorProps {
  selectedModules: string[];
  onChange: (modules: string[]) => void;
}

export function ModuleSelector({ selectedModules, onChange }: ModuleSelectorProps) {
  const [modules, setModules] = useState<Module[]>([
    { code: 'academic', name: 'Academic Management', description: 'Student enrollment, classes, marks, report cards, grading', is_active: true },
    { code: 'finance', name: 'Finance Management', description: 'Fees, payments, income, expenditure tracking', is_active: true },
    { code: 'hr', name: 'HR & Payroll', description: 'Staff management, payroll processing, salary structures', is_active: true },
    { code: 'library', name: 'Library Management', description: 'Book cataloging, issuing, returns, fines', is_active: true },
    { code: 'clinic', name: 'Clinic Management', description: 'Health records, visits, medicines, emergencies', is_active: true },
    { code: 'inventory', name: 'Inventory Management', description: 'Stock tracking, requisitions, suppliers', is_active: true },
    { code: 'sms', name: 'SMS Notifications', description: 'Send SMS for fees, attendance, results', is_active: true },
    { code: 'parent_portal', name: 'Parent Portal', description: 'Parent access to student progress and fees', is_active: true },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/modules', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setModules(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      // Keep default modules if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (code: string) => {
    if (selectedModules.includes(code)) {
      onChange(selectedModules.filter(m => m !== code));
    } else {
      onChange([...selectedModules, code]);
    }
  };

  return (
    <div className="space-y-3">
      {modules.map((module) => (
        <label 
          key={module.code} 
          className="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 cursor-pointer transition-all group"
        >
          <input
            type="checkbox"
            checked={selectedModules.includes(module.code)}
            onChange={() => handleToggle(module.code)}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {module.name}
              </span>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded uppercase">
                {module.code}
              </span>
            </div>
            <p className="text-sm text-gray-600">{module.description}</p>
          </div>
        </label>
      ))}
      {modules.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>No modules available</p>
        </div>
      )}
    </div>
  );
}

export default function ActiveModulesDisplay() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveModules();
  }, []);

  const fetchActiveModules = async () => {
    try {
      const response = await fetch('/api/v1/subscriptions/modules', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await response.json();
      setModules(data);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card shadow="sm" padding="lg">
      <Text size="xl" fw={700} mb="md">Active Modules</Text>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Module</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {modules.map((module) => (
            <Table.Tr key={module.code}>
              <Table.Td>{module.name}</Table.Td>
              <Table.Td>{module.description}</Table.Td>
              <Table.Td>
                <Badge color="green">Active</Badge>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  );
}
