'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, Grid, Text } from '@mantine/core'

export default function NurseDashboard() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Nurse Dashboard</h1>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" p="lg">
              <Text size="lg" fw={600}>Patient Visits</Text>
              <Text c="dimmed">Record and manage clinic visits</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" p="lg">
              <Text size="lg" fw={600}>Medicine Inventory</Text>
              <Text c="dimmed">Track medicines and supplies</Text>
            </Card>
          </Grid.Col>
        </Grid>
      </div>
    </DashboardLayout>
  )
}
