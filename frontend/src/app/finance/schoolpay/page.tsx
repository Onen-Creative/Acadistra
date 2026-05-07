'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { 
  CreditCard, Settings, List, AlertCircle, CheckCircle, XCircle, TrendingUp 
} from 'lucide-react';

interface SchoolPayStats {
  isConfigured: boolean;
  isActive: boolean;
  totalTransactions: number;
  pendingTransactions: number;
  totalAmount: number;
  todayTransactions: number;
}

export default function SchoolPayPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SchoolPayStats>({
    isConfigured: false,
    isActive: false,
    totalTransactions: 0,
    pendingTransactions: 0,
    totalAmount: 0,
    todayTransactions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [configRes, transactionsRes] = await Promise.all([
        api.get('/schoolpay/config').catch(() => null),
        api.get('/schoolpay/transactions').catch(() => ({ data: [] })),
      ]);

      const transactions = transactionsRes.data || [];
      const today = new Date().toISOString().split('T')[0];
      const todayTxns = transactions.filter((t: any) => 
        t.payment_date_and_time?.startsWith(today)
      );

      setStats({
        isConfigured: !!configRes?.data,
        isActive: configRes?.data?.is_active || false,
        totalTransactions: transactions.length,
        pendingTransactions: transactions.filter(
          (t: any) => !t.processed && t.transaction_completion_status === 'Completed'
        ).length,
        totalAmount: transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
        todayTransactions: todayTxns.length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              SchoolPay Integration
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time mobile money payment notifications from SchoolPay Uganda
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.isActive ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Inactive</span>
              </div>
            )}
          </div>
        </div>

        {/* Alert if not configured */}
        {!stats.isConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">Configuration Required</h3>
              <p className="text-sm text-yellow-700 mt-1">
                SchoolPay integration is not configured yet. Click the Configuration card below to get started.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Total
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
            <p className="text-sm text-gray-600 mt-1">Total Transactions</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded">
                Pending
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingTransactions}</p>
            <p className="text-sm text-gray-600 mt-1">Pending Processing</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Amount
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            <p className="text-sm text-gray-600 mt-1">Total Received</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                Today
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.todayTransactions}</p>
            <p className="text-sm text-gray-600 mt-1">Today's Payments</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Configuration Card */}
          <button
            onClick={() => router.push('/finance/schoolpay/config')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                {stats.isConfigured ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Configured</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">Not Setup</span>
                  </>
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Configuration</h3>
            <p className="text-sm text-gray-600 mb-4">
              Set up your SchoolPay credentials and webhook URL
            </p>
            <div className="flex items-center text-blue-600 text-sm font-medium group-hover:gap-2 transition-all">
              <span>{stats.isConfigured ? 'Manage Settings' : 'Setup Now'}</span>
              <span className="ml-1 group-hover:ml-2 transition-all">→</span>
            </div>
          </button>

          {/* Transactions Card */}
          <button
            onClick={() => router.push('/finance/schoolpay/transactions')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <List className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <span className="text-xs font-medium text-blue-700">{stats.totalTransactions} Total</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Transactions</h3>
            <p className="text-sm text-gray-600 mb-4">
              View and manage all SchoolPay payment transactions
            </p>
            <div className="flex items-center text-green-600 text-sm font-medium group-hover:gap-2 transition-all">
              <span>View All Transactions</span>
              <span className="ml-1 group-hover:ml-2 transition-all">→</span>
            </div>
          </button>

          {/* Pending Card */}
          <button
            onClick={() => router.push('/finance/schoolpay/transactions')}
            disabled={stats.pendingTransactions === 0}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all text-left group ${
              stats.pendingTransactions > 0 ? 'hover:border-orange-300' : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-transform ${
                stats.pendingTransactions > 0 
                  ? 'bg-gradient-to-br from-orange-500 to-red-600 group-hover:scale-110' 
                  : 'bg-gray-200'
              }`}>
                <AlertCircle className={`w-7 h-7 ${
                  stats.pendingTransactions > 0 ? 'text-white' : 'text-gray-400'
                }`} />
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                stats.pendingTransactions > 0 ? 'bg-orange-50' : 'bg-gray-100'
              }`}>
                <span className={`text-xs font-medium ${
                  stats.pendingTransactions > 0 ? 'text-orange-700' : 'text-gray-600'
                }`}>
                  {stats.pendingTransactions} Pending
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Pending Payments</h3>
            <p className="text-sm text-gray-600 mb-4">
              Unprocessed transactions waiting to be reconciled
            </p>
            <div className={`flex items-center text-sm font-medium group-hover:gap-2 transition-all ${
              stats.pendingTransactions > 0 ? 'text-orange-600' : 'text-gray-400'
            }`}>
              <span>{stats.pendingTransactions > 0 ? 'Process Now' : 'No Pending'}</span>
              {stats.pendingTransactions > 0 && (
                <span className="ml-1 group-hover:ml-2 transition-all">→</span>
              )}
            </div>
          </button>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-blue-600">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Configure Integration</h3>
                  <p className="text-sm text-gray-600">
                    Enter your SchoolPay credentials and enable webhook notifications
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-green-600">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Register Webhook</h3>
                  <p className="text-sm text-gray-600">
                    Copy the webhook URL and register it in your SchoolPay portal
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-purple-600">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Receive Payments</h3>
                  <p className="text-sm text-gray-600">
                    Parents pay via MTN/Airtel Mobile Money through SchoolPay
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-orange-600">4</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Auto-Reconciliation</h3>
                  <p className="text-sm text-gray-600">
                    Payments are automatically matched to students and recorded
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
