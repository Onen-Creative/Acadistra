'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Table,
  LoadingOverlay,
  Select,
  TextInput,
  Modal,
  Alert,
  ActionIcon,
  Tooltip,
  Menu,
  Breadcrumbs,
  Anchor,
} from '@mantine/core';
import {
  IconRefresh,
  IconFilter,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconDots,
  IconEye,
  IconCreditCard,
  IconCalendar,
  IconArrowLeft,
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import api from '@/services/api';
import { DashboardLayout } from '@/components/DashboardLayout';

interface SchoolPayTransaction {
  id: string;
  transaction_type: string;
  schoolpay_receipt_number: string;
  amount: number;
  student_payment_code: string;
  student_name: string;
  student_class: string;
  source_payment_channel: string;
  payment_date_and_time: string;
  transaction_completion_status: string;
  processed: boolean;
  error_message?: string;
  supplementary_fee_description?: string;
}

export default function SchoolPayTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<SchoolPayTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<SchoolPayTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<SchoolPayTransaction | null>(null);
  const [detailsOpened, setDetailsOpened] = useState(false);
  const [syncModalOpened, setSyncModalOpened] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Filters
  const [processedFilter, setProcessedFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync form
  const [syncFromDate, setSyncFromDate] = useState<Date | null>(null);
  const [syncToDate, setSyncToDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, processedFilter, typeFilter, dateRange, searchQuery]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/schoolpay/transactions');
      setTransactions(response.data);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load transactions',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (processedFilter !== 'all') {
      filtered = filtered.filter((t) => t.processed === (processedFilter === 'true'));
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.transaction_type === typeFilter);
    }

    if (dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((t) => {
        const txnDate = new Date(t.payment_date_and_time);
        return txnDate >= dateRange[0]! && txnDate <= dateRange[1]!;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.student_name.toLowerCase().includes(query) ||
          t.student_payment_code.toLowerCase().includes(query) ||
          t.schoolpay_receipt_number.toLowerCase().includes(query)
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleSync = async () => {
    if (!syncFromDate) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a start date',
        color: 'red',
      });
      return;
    }

    try {
      setSyncing(true);
      const payload: any = {
        from_date: syncFromDate.toISOString().split('T')[0],
      };

      if (syncToDate) {
        payload.to_date = syncToDate.toISOString().split('T')[0];
      }

      await api.post('/schoolpay/sync', payload);
      notifications.show({
        title: 'Success',
        message: 'Transactions synced successfully',
        color: 'green',
        icon: <IconCheck />,
      });
      setSyncModalOpened(false);
      fetchTransactions();
    } catch (error: any) {
      notifications.show({
        title: 'Sync Failed',
        message: error.response?.data?.error || 'Failed to sync transactions',
        color: 'red',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleProcessPending = async () => {
    try {
      setProcessing(true);
      await api.post('/schoolpay/process');
      notifications.show({
        title: 'Success',
        message: 'Pending transactions processed successfully',
        color: 'green',
        icon: <IconCheck />,
      });
      fetchTransactions();
    } catch (error: any) {
      notifications.show({
        title: 'Processing Failed',
        message: error.response?.data?.error || 'Failed to process transactions',
        color: 'red',
      });
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = transactions.filter((t) => !t.processed && t.transaction_completion_status === 'Completed').length;

  return (
    <DashboardLayout>
      <LoadingOverlay visible={loading} />

      <Stack gap="lg">
        <div>
          <Breadcrumbs mb="md">
            <Anchor component={Link} href="/finance/schoolpay" c="dimmed">
              SchoolPay
            </Anchor>
            <Text>Transactions</Text>
          </Breadcrumbs>

          <Group justify="space-between" mb="xl">
            <div>
              <Group gap="xs" mb="xs">
                <IconCreditCard size={28} stroke={1.5} />
                <Title order={2}>SchoolPay Transactions</Title>
              </Group>
              <Text size="sm" c="dimmed">
                View and manage SchoolPay payment transactions
              </Text>
            </div>
            <Group>
              <Button
                variant="light"
                leftSection={<IconArrowLeft size={16} />}
                component={Link}
                href="/finance/schoolpay"
              >
                Back to SchoolPay
              </Button>
              {pendingCount > 0 && (
                <Button
                  variant="light"
                  color="orange"
                  leftSection={<IconCheck size={16} />}
                  onClick={handleProcessPending}
                  loading={processing}
                >
                  Process {pendingCount} Pending
                </Button>
              )}
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={() => setSyncModalOpened(true)}
              >
                Sync Transactions
              </Button>
            </Group>
          </Group>
        </div>

        {pendingCount > 0 && (
          <Alert icon={<IconAlertCircle />} title="Pending Transactions" color="orange">
            You have {pendingCount} unprocessed completed transactions. Click "Process Pending" to
            create fee payment records.
          </Alert>
        )}

        <Paper p="lg" withBorder radius="md" shadow="xs">
          <Group gap="md" wrap="wrap">
            <Select
              placeholder="Filter by status"
              data={[
                { value: 'all', label: 'All Status' },
                { value: 'true', label: 'Processed' },
                { value: 'false', label: 'Unprocessed' },
              ]}
              value={processedFilter}
              onChange={(value) => setProcessedFilter(value || 'all')}
              leftSection={<IconFilter size={16} />}
              style={{ width: 180 }}
            />

            <Select
              placeholder="Filter by type"
              data={[
                { value: 'all', label: 'All Types' },
                { value: 'SCHOOL_FEES', label: 'School Fees' },
                { value: 'OTHER_FEES', label: 'Other Fees' },
              ]}
              value={typeFilter}
              onChange={(value) => setTypeFilter(value || 'all')}
              style={{ width: 180 }}
            />

            <DatePickerInput
              type="range"
              placeholder="Filter by date range"
              value={dateRange}
              onChange={setDateRange}
              leftSection={<IconCalendar size={16} />}
              style={{ width: 280 }}
              clearable
            />

            <TextInput
              placeholder="Search by name, code, or receipt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 250 }}
            />

            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={fetchTransactions}
            >
              Refresh
            </Button>
          </Group>
        </Paper>

        <Paper withBorder radius="md" shadow="xs">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Receipt #</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Student</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Channel</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Processed</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredTransactions.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9} style={{ textAlign: 'center' }}>
                    <Text c="dimmed" py="xl">
                      No transactions found
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <Table.Tr key={txn.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {txn.schoolpay_receipt_number}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(txn.payment_date_and_time).toLocaleDateString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(txn.payment_date_and_time).toLocaleTimeString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {txn.student_name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {txn.student_payment_code}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        color={txn.transaction_type === 'SCHOOL_FEES' ? 'blue' : 'grape'}
                      >
                        {txn.transaction_type === 'SCHOOL_FEES' ? 'School Fees' : 'Other Fees'}
                      </Badge>
                      {txn.supplementary_fee_description && (
                        <Text size="xs" c="dimmed" mt={2}>
                          {txn.supplementary_fee_description}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        UGX {txn.amount.toLocaleString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{txn.source_payment_channel}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        color={txn.transaction_completion_status === 'Completed' ? 'green' : 'yellow'}
                      >
                        {txn.transaction_completion_status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {txn.processed ? (
                        <Badge size="sm" color="green" leftSection={<IconCheck size={12} />}>
                          Processed
                        </Badge>
                      ) : txn.error_message ? (
                        <Tooltip label={txn.error_message}>
                          <Badge size="sm" color="red" leftSection={<IconX size={12} />}>
                            Failed
                          </Badge>
                        </Tooltip>
                      ) : (
                        <Badge size="sm" color="gray">
                          Pending
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <ActionIcon variant="subtle">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEye size={14} />}
                            onClick={() => {
                              setSelectedTransaction(txn);
                              setDetailsOpened(true);
                            }}
                          >
                            View Details
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </Text>
        </Group>
      </Stack>
    </DashboardLayout>
  );
}

function TransactionModals({
  syncModalOpened,
  setSyncModalOpened,
  detailsOpened,
  setDetailsOpened,
  syncFromDate,
  setSyncFromDate,
  syncToDate,
  setSyncToDate,
  handleSync,
  syncing,
  selectedTransaction,
}: any) {
  return (
    <>
      <Modal
        opened={syncModalOpened}
        onClose={() => setSyncModalOpened(false)}
        title="Sync Transactions"
        size="md"
      >
        <Stack gap="md">
          <Alert icon={<IconAlertCircle />} color="blue">
            Sync transactions from SchoolPay for a specific date or date range (max 31 days).
          </Alert>

          <DatePickerInput
            label="From Date"
            placeholder="Select start date"
            value={syncFromDate}
            onChange={setSyncFromDate}
            required
          />

          <DatePickerInput
            label="To Date (Optional)"
            placeholder="Select end date"
            description="Leave empty to sync only the start date"
            value={syncToDate}
            onChange={setSyncToDate}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setSyncModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleSync} loading={syncing}>
              Sync Transactions
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={detailsOpened}
        onClose={() => setDetailsOpened(false)}
        title="Transaction Details"
        size="lg"
      >
        {selectedTransaction && (
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={500}>Receipt Number</Text>
              <Text>{selectedTransaction.schoolpay_receipt_number}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Amount</Text>
              <Text fw={700} size="lg">
                UGX {selectedTransaction.amount.toLocaleString()}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Student Name</Text>
              <Text>{selectedTransaction.student_name}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Payment Code</Text>
              <Text>{selectedTransaction.student_payment_code}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Class</Text>
              <Text>{selectedTransaction.student_class || 'N/A'}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Transaction Type</Text>
              <Badge color={selectedTransaction.transaction_type === 'SCHOOL_FEES' ? 'blue' : 'grape'}>
                {selectedTransaction.transaction_type}
              </Badge>
            </Group>
            {selectedTransaction.supplementary_fee_description && (
              <Group justify="space-between">
                <Text fw={500}>Fee Description</Text>
                <Text>{selectedTransaction.supplementary_fee_description}</Text>
              </Group>
            )}
            <Group justify="space-between">
              <Text fw={500}>Payment Channel</Text>
              <Text>{selectedTransaction.source_payment_channel}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Payment Date</Text>
              <Text>{new Date(selectedTransaction.payment_date_and_time).toLocaleString()}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Status</Text>
              <Badge color={selectedTransaction.transaction_completion_status === 'Completed' ? 'green' : 'yellow'}>
                {selectedTransaction.transaction_completion_status}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Processed</Text>
              {selectedTransaction.processed ? (
                <Badge color="green" leftSection={<IconCheck size={12} />}>
                  Yes
                </Badge>
              ) : (
                <Badge color="gray">No</Badge>
              )}
            </Group>
            {selectedTransaction.error_message && (
              <Alert icon={<IconAlertCircle />} color="red" title="Processing Error">
                {selectedTransaction.error_message}
              </Alert>
            )}
          </Stack>
        )}
      </Modal>
    </>
  );
}
