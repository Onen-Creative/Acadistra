'use client';

import { Button, Menu, Text } from '@mantine/core';
import { IconTemplate } from '@tabler/icons-react';

interface Template {
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_roles: string[];
}

interface TemplatesSelectorProps {
  onSelect: (template: Template) => void;
}

export default function TemplatesSelector({ onSelect }: TemplatesSelectorProps) {
  const templates: Template[] = [
    {
      title: 'System Maintenance Notice',
      message: 'The system will undergo scheduled maintenance on [DATE] from [START_TIME] to [END_TIME]. Please save your work before this time.\n\nThank you for your understanding.',
      priority: 'high',
      target_roles: ['teacher', 'school_admin', 'bursar', 'librarian', 'nurse'],
    },
    {
      title: 'New Feature Release',
      message: 'We are excited to announce a new feature: [FEATURE_NAME]\n\n[FEATURE_DESCRIPTION]\n\nPlease explore and let us know your feedback.',
      priority: 'normal',
      target_roles: ['teacher', 'school_admin'],
    },
    {
      title: 'Urgent System Issue',
      message: 'URGENT: We are currently experiencing [ISSUE_DESCRIPTION]. Our team is working to resolve this as quickly as possible.\n\nWe apologize for any inconvenience.',
      priority: 'urgent',
      target_roles: ['teacher', 'school_admin', 'bursar', 'librarian', 'nurse', 'parent'],
    },
    {
      title: 'Parent Portal Update',
      message: 'Dear Parents,\n\nWe have updated the parent portal with new features:\n- [FEATURE_1]\n- [FEATURE_2]\n\nLogin to explore the improvements.',
      priority: 'normal',
      target_roles: ['parent'],
    },
    {
      title: 'Policy Update',
      message: 'Important Policy Update\n\nPlease note the following policy changes effective [DATE]:\n\n[POLICY_DETAILS]\n\nPlease review and comply accordingly.',
      priority: 'high',
      target_roles: ['school_admin', 'teacher'],
    },
  ];

  return (
    <Menu shadow="md" width={300}>
      <Menu.Target>
        <Button variant="light" leftSection={<IconTemplate size={16} />}>
          Use Template
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Common Templates</Menu.Label>
        {templates.map((template, index) => (
          <Menu.Item
            key={index}
            onClick={() => onSelect(template)}
          >
            <Text size="sm" fw={500}>{template.title}</Text>
            <Text size="xs" c="dimmed" lineClamp={1}>{template.message}</Text>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
