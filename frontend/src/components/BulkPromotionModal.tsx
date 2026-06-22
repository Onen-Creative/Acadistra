'use client'

import { useState } from 'react'
import { Modal, Select, Button, Text, Checkbox, Alert } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import api, { classesApi } from '@/services/api'

interface Student {
  id: string
  first_name: string
  last_name: string
  admission_no: string
}

interface BulkPromotionModalProps {
  opened: boolean
  onClose: () => void
  sourceClassId: string
  sourceClassName: string
  currentYear: string
}

export function BulkPromotionModal({ opened, onClose, sourceClassId, sourceClassName, currentYear }: BulkPromotionModalProps) {
  const [targetClassId, setTargetClassId] = useState('')
  const [newYear, setNewYear] = useState(String(Number(currentYear) + 1))
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-promotion', sourceClassId, currentYear],
    queryFn: async () => {
      const res = await api.get(`/api/v1/students`, {
        params: { class_id: sourceClassId, year: currentYear, limit: -1 }
      })
      return Array.isArray(res.data) ? res.data : res.data.students
    },
    enabled: !!sourceClassId && opened
  })

  const { data: targetClasses = [] } = useQuery({
    queryKey: ['classes', newYear],
    queryFn: async () => {
      const res = await classesApi.list({ year: parseInt(newYear) })
      return Array.isArray(res) ? res : res.classes
    },
    enabled: opened
  })

  const promotionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/v1/students/bulk-promote', {
        student_ids: Array.from(selectedStudents),
        new_class_id: targetClassId,
        new_year: Number(newYear)
      })
      return res.data
    },
    onSuccess: (data) => {
      notifications.show({ 
        title: 'Success', 
        message: `${data.promoted_count} students promoted successfully`, 
        color: 'green' 
      })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      onClose()
      setSelectedStudents(new Set())
    },
    onError: (error: any) => {
      notifications.show({ 
        title: 'Error', 
        message: error.response?.data?.error || 'Failed to promote students', 
        color: 'red' 
      })
    }
  })

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudents)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedStudents(newSet)
  }

  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map((s: Student) => s.id)))
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Bulk Student Promotion" size="xl">
      <div className="space-y-4">
        <Alert color="blue" variant="light">
          Promote students from <strong>{sourceClassName}</strong> ({currentYear}) to a new class for {newYear}
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="New Academic Year"
            value={newYear}
            onChange={(value) => setNewYear(value || String(Number(currentYear) + 1))}
            data={[
              { value: String(Number(currentYear) + 1), label: String(Number(currentYear) + 1) },
              { value: String(Number(currentYear) + 2), label: String(Number(currentYear) + 2) }
            ]}
            required
          />
          <Select
            label="Target Class"
            placeholder="Select target class"
            value={targetClassId}
            onChange={(value) => setTargetClassId(value || '')}
            data={targetClasses.map((c: any) => ({ value: c.id, label: c.name }))}
            required
          />
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <Text size="sm" fw={500}>Select Students to Promote</Text>
            <Button size="xs" variant="light" onClick={toggleAll}>
              {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {students.map((student: Student) => (
              <div key={student.id} className="flex items-center gap-3 p-2 bg-white rounded border hover:bg-gray-50">
                <Checkbox
                  checked={selectedStudents.has(student.id)}
                  onChange={() => toggleStudent(student.id)}
                />
                <div className="flex-1">
                  <Text size="sm" fw={500}>{student.first_name} {student.last_name}</Text>
                  <Text size="xs" c="dimmed">{student.admission_no}</Text>
                </div>
              </div>
            ))}
          </div>

          <Text size="xs" c="dimmed" mt="sm">
            {selectedStudents.size} of {students.length} students selected
          </Text>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => promotionMutation.mutate()}
            disabled={selectedStudents.size === 0 || !targetClassId}
            loading={promotionMutation.isPending}
          >
            Promote {selectedStudents.size} Student(s)
          </Button>
        </div>
      </div>
    </Modal>
  )
}
