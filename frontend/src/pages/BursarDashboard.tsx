import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feesApi, studentsApi, classesApi, authApi } from '@/services/api';
import { useActivityDialog } from '@/hooks/useActivityDialog';
import ActivityDialog from '@/components/ActivityDialog';
import PaymentReceipt from '@/components/PaymentReceipt';
import DashboardHeader from '@/components/DashboardHeader';
import FilterBar from '@/components/FilterBar';
import * as XLSX from 'xlsx';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function BursarDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  useWebSocket(['fees:', 'payment:', 'student:']);
  const { dialog, showSuccess, showError, closeDialog } = useActivityDialog();
  
  const getInitialSection = () => {
    if (location.pathname === '/fees') return 'fees';
    return 'dashboard';
  };
  
  const [activeSection, setActiveSection] = useState<'dashboard' | 'fees'>(getInitialSection());
  const [selectedClass, setSelectedClass] = useState('');
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(2026);
  const [search, setSearch] = useState('');
  const [showAddFees, setShowAddFees] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'all' | 'paid' | 'outstanding'>('all');
  const itemsPerPage = 10;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setActiveSection(getInitialSection());
  }, [location.pathname]);

  const { data: levels } = useQuery({
    queryKey: ['class-levels'],
    queryFn: () => classesApi.getLevels(),
  });

  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useQuery({
    queryKey: ['students', selectedClass, term, year],
    queryFn: () => studentsApi.list({ class_level: selectedClass, term, year: year.toString(), limit: 1000 }),
    enabled: !!selectedClass,
  });

  const { data: fees } = useQuery({
    queryKey: ['fees', selectedClass, term, year],
    queryFn: () => feesApi.list({ level: selectedClass, term, year: Number(year) }),
    enabled: !!selectedClass,
    select: (data) => Array.isArray(data) ? data : data?.fees || [],
  });

  const { data: allFees, isLoading: isLoadingFees } = useQuery({
    queryKey: ['all-fees', term, year],
    queryFn: () => feesApi.list({ term, year: Number(year) }),
    select: (data) => {
      const fees = Array.isArray(data) ? data : data?.fees || [];
      console.log('allFees data:', fees);
      return fees;
    },
  });

  const createFeesMutation = useMutation({
    mutationFn: feesApi.createOrUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['all-fees'] });
      showSuccess('Success!', 'Fees record created successfully');
      setShowAddFees(false);
    },
    onError: () => showError('Error!', 'Failed to create fees record'),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Recording payment with data:', data);
      return feesApi.recordPayment(data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['all-fees'] });
      showSuccess('Success!', 'Payment recorded successfully');
      setShowPayment(false);
      
      if (response.payment && response.updated_fees) {
        setReceiptData({
          payment: response.payment,
          studentFees: { ...response.updated_fees, student: selectedStudent?.student }
        });
        setShowReceipt(true);
      }
    },
    onError: (error: any) => {
      console.error('Payment error:', error);
      console.error('Payment error response:', error.response?.data);
      showError('Error!', error.response?.data?.error || 'Failed to record payment');
    },
  });

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      navigate('/login');
    }
  };

  const exportToExcel = () => {
    if (!fees) return;
    
    const totalExpected = fees.reduce((sum: number, f: any) => sum + (f.total_fees || 0), 0);
    const totalPaid = fees.reduce((sum: number, f: any) => sum + (f.amount_paid || 0), 0);
    const totalOutstanding = fees.reduce((sum: number, f: any) => sum + (f.outstanding || 0), 0);
    
    const data = fees.map((fee: any) => ({
      'Student Name': `${fee.student?.first_name} ${fee.student?.last_name}`,
      'Admission No': fee.student?.admission_no,
      'LIN': fee.student?.lin || '',
      'Total Fees': fee.total_fees,
      'Amount Paid': fee.amount_paid,
      'Outstanding': fee.outstanding,
      'Term': fee.term,
      'Year': fee.year,
    }));
    
    data.push({});
    data.push({
      'Student Name': 'CLASS TOTALS',
      'Admission No': '',
      'LIN': '',
      'Total Fees': totalExpected,
      'Amount Paid': totalPaid,
      'Outstanding': totalOutstanding,
      'Term': '',
      'Year': '',
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Fees_${selectedClass}_${term}_${year}`);
    XLSX.writeFile(wb, `fees_${selectedClass}_${term}_${year}.xlsx`);
  };

  const filteredFees = fees?.filter((fee: any) => {
    if (sortBy === 'paid') return fee.outstanding === 0;
    if (sortBy === 'outstanding') return fee.outstanding > 0;
    return true;
  }) || [];

  const totalPages = Math.ceil((filteredFees?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFees = filteredFees?.slice(startIndex, startIndex + itemsPerPage) || [];

  const systemTotals = {
    expected: (allFees || []).reduce((sum: number, f: any) => sum + (f.total_fees || 0), 0),
    paid: (allFees || []).reduce((sum: number, f: any) => sum + (f.amount_paid || 0), 0),
    outstanding: (allFees || []).reduce((sum: number, f: any) => sum + (f.outstanding || 0), 0),
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="bursar" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        <DashboardHeader
          title="Bursar Dashboard"
          subtitle="Financial Management System"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {activeSection === 'dashboard' && (
              <div>
                <FilterBar
                  term={term}
                  year={year}
                  search={search}
                  onTermChange={setTerm}
                  onYearChange={setYear}
                  onSearchChange={setSearch}
                  searchPlaceholder="Search fees..."
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-4 text-white">
                    <p className="text-xs opacity-90 mb-1">Total Expected</p>
                    <p className="text-2xl font-bold">UGX {systemTotals.expected.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-4 text-white">
                    <p className="text-xs opacity-90 mb-1">Total Collected</p>
                    <p className="text-2xl font-bold">UGX {systemTotals.paid.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-4 text-white">
                    <p className="text-xs opacity-90 mb-1">Outstanding</p>
                    <p className="text-2xl font-bold">UGX {systemTotals.outstanding.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {levels?.map((level: any) => {
                    const levelFees = (allFees || []).filter((f: any) => {
                      console.log(`Checking fee for ${level.level}:`, f.class_level, f);
                      return f.class_level === level.level;
                    });
                    const expected = levelFees.reduce((sum: number, f: any) => sum + (f.total_fees || 0), 0);
                    const paid = levelFees.reduce((sum: number, f: any) => sum + (f.amount_paid || 0), 0);
                    const outstanding = levelFees.reduce((sum: number, f: any) => sum + (f.outstanding || 0), 0);
                    console.log(`${level.level} summary:`, { count: levelFees.length, expected, paid, outstanding });
                    
                    return (
                      <div key={level.level} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4">
                          <h3 className="text-xl font-bold text-white">{level.level}</h3>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Expected</span>
                            <span className="text-sm font-bold text-blue-600">UGX {expected.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Collected</span>
                            <span className="text-sm font-bold text-green-600">UGX {paid.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Outstanding</span>
                            <span className="text-sm font-bold text-red-600">UGX {outstanding.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Students</span>
                            <span className="text-sm font-bold text-gray-600">{levelFees.length}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'fees' && (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Fees Management</h2>
                    <div className="flex gap-3">
                      <select value={term} onChange={(e) => setTerm(e.target.value)} className="border rounded-xl px-3 py-2 text-sm">
                        <option value="Term1">Term 1</option>
                        <option value="Term2">Term 2</option>
                        <option value="Term3">Term 3</option>
                      </select>
                      <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded-xl px-3 py-2 text-sm w-24" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-4 text-white">
                    <p className="text-xs opacity-90 mb-1">Total Expected</p>
                    <p className="text-2xl font-bold">UGX {systemTotals.expected.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-4 text-white">
                    <p className="text-xs opacity-90 mb-1">Total Collected</p>
                    <p className="text-2xl font-bold">UGX {systemTotals.paid.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-4 text-white">
                    <p className="text-xs opacity-90 mb-1">Outstanding</p>
                    <p className="text-2xl font-bold">UGX {systemTotals.outstanding.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 border border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Class *</label>
                      <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm">
                        <option value="">Select class</option>
                        {levels?.map((level: any) => <option key={level.level} value={level.level}>{level.level}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Filter</label>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} disabled={!selectedClass} className="w-full border rounded-xl px-3 py-2 text-sm">
                        <option value="all">All</option>
                        <option value="paid">Paid</option>
                        <option value="outstanding">Outstanding</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddFees(true)} disabled={!selectedClass} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm disabled:opacity-50">
                        ➕ Add
                      </button>
                      <button onClick={exportToExcel} disabled={!fees?.length} className="flex-1 bg-green-600 text-white px-3 py-2 rounded-xl text-sm disabled:opacity-50">
                        📊 Export
                      </button>
                    </div>
                  </div>
                </div>

                {selectedClass && fees && (
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Student</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Paid</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Outstanding</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedFees.map((fee: any) => (
                            <tr key={fee.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-sm">{fee.student?.first_name} {fee.student?.last_name}</p>
                                <p className="text-xs text-gray-500">{fee.student?.admission_no}</p>
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-sm">UGX {fee.total_fees?.toLocaleString()}</td>
                              <td className="px-4 py-3 text-center font-semibold text-green-600 text-sm">UGX {fee.amount_paid?.toLocaleString()}</td>
                              <td className="px-4 py-3 text-center font-semibold text-red-600 text-sm">UGX {fee.outstanding?.toLocaleString()}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex justify-center gap-2">
                                  <button onClick={() => { setSelectedStudent(fee); setShowPayment(true); }} className="bg-green-500 text-white px-3 py-1 rounded text-xs">
                                    💳 Pay
                                  </button>
                                  <button onClick={() => { setReceiptData({ studentFees: fee, payment: { amount: fee.amount_paid, payment_date: new Date().toISOString(), payment_method: 'Various', receipt_no: `RCP-${fee.id.slice(-6)}` } }); setShowReceipt(true); }} className="bg-blue-500 text-white px-3 py-1 rounded text-xs">
                                    🧾 Receipt
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="mobile-nav lg:hidden">
          <div className="flex justify-around">
            <button onClick={() => { setActiveSection('dashboard'); navigate('/dashboard'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition ${activeSection === 'dashboard' ? 'text-amber-600 bg-amber-50' : 'text-gray-600'}`}>
              <span className="text-lg mb-1">📊</span>
              <span className="text-xs font-medium">Dashboard</span>
            </button>
            <button onClick={() => { setActiveSection('fees'); navigate('/fees'); }} className={`flex flex-col items-center py-2 px-3 rounded-lg transition ${activeSection === 'fees' ? 'text-amber-600 bg-amber-50' : 'text-gray-600'}`}>
              <span className="text-lg mb-1">💰</span>
              <span className="text-xs font-medium">Fees</span>
            </button>
          </div>
        </div>
      </div>

      <AddFeesModal 
        isOpen={showAddFees} 
        onClose={() => setShowAddFees(false)} 
        students={students} 
        term={term} 
        year={year} 
        onSubmit={createFeesMutation.mutate} 
        selectedClass={selectedClass}
        isLoadingStudents={isLoadingStudents}
        studentsError={studentsError}
      />
      <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} studentFees={selectedStudent} onSubmit={recordPaymentMutation.mutate} />
      {showReceipt && receiptData && <PaymentReceipt payment={receiptData.payment} studentFees={receiptData.studentFees} onClose={() => setShowReceipt(false)} />}
      <ActivityDialog isOpen={dialog.isOpen} onClose={closeDialog} title={dialog.title} message={dialog.message} type={dialog.type} onConfirm={dialog.onConfirm} confirmText={dialog.confirmText} cancelText={dialog.cancelText} />
    </div>
  );
}

function AddFeesModal({ isOpen, onClose, students, term, year, onSubmit, selectedClass, isLoadingStudents, studentsError }: any) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [totalFees, setTotalFees] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ student_id: selectedStudent, term, year, total_fees: parseFloat(totalFees) });
    setSelectedStudent('');
    setTotalFees('');
  };

  if (!isOpen) return null;

  const studentList = students?.students || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Add Fees Record</h3>
        <div className="mb-4 text-sm text-gray-600">
          <p>Class: {selectedClass || 'None'}</p>
          <p>Students available: {studentList.length}</p>
          {isLoadingStudents && <p className="text-blue-600">Loading students...</p>}
          {studentsError && <p className="text-red-600">Error loading students</p>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Student</label>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required className="w-full border rounded-lg px-3 py-2" disabled={isLoadingStudents}>
              <option value="">{isLoadingStudents ? 'Loading...' : `Select student (${studentList.length} available)`}</option>
              {studentList.map((student: any) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name} - {student.admission_no}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Total Fees (UGX)</label>
            <input type="number" value={totalFees} onChange={(e) => setTotalFees(e.target.value)} required min="0" step="1000" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-blue-500 text-white py-2 rounded-lg" disabled={isLoadingStudents || studentList.length === 0}>Create</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({ isOpen, onClose, studentFees, onSubmit }: any) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receiptNo, setReceiptNo] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paymentData = { 
      student_fees_id: studentFees?.id, 
      amount: parseFloat(amount), 
      payment_method: paymentMethod, 
      receipt_no: receiptNo, 
      notes 
    };
    console.log('Payment submit - studentFees:', studentFees);
    console.log('Payment submit - studentFees.id:', studentFees?.id);
    console.log('Payment submit - paymentData:', paymentData);
    onSubmit(paymentData);
    setAmount('');
    setReceiptNo('');
    setNotes('');
  };

  if (!isOpen || !studentFees) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Record Payment</h3>
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-semibold text-sm">{studentFees.student?.first_name} {studentFees.student?.last_name}</p>
          <p className="text-xs text-gray-600">Outstanding: UGX {studentFees.outstanding?.toLocaleString()}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount (UGX)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" max={studentFees.outstanding} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Mobile Money</option>
              <option>Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Receipt No</label>
            <input type="text" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-green-500 text-white py-2 rounded-lg">Record Payment</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
