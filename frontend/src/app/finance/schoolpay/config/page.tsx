'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Copy, RefreshCw, Settings, Webhook, CreditCard, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/services/api';

interface SchoolPayConfig {
  id?: string;
  school_id?: string;
  school_code: string;
  api_password: string;
  webhook_url: string;
  webhook_enabled: boolean;
  is_active: boolean;
  last_sync_at?: string;
}

export default function SchoolPayConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SchoolPayConfig>({
    school_code: '',
    api_password: '',
    webhook_url: '',
    webhook_enabled: false,
    is_active: false,
  });
  const [hasConfig, setHasConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/schoolpay/config');
      setConfig(response.data);
      setHasConfig(true);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHasConfig(false);
        generateWebhookURL();
      }
    } finally {
      setLoading(false);
    }
  };

  const generateWebhookURL = () => {
    const baseURL = window.location.origin;
    const schoolId = localStorage.getItem('school_id') || 'YOUR_SCHOOL_ID';
    const webhookURL = `${baseURL}/api/v1/webhooks/schoolpay/${schoolId}`;
    setConfig((prev) => ({ ...prev, webhook_url: webhookURL }));
  };

  const handleSave = async () => {
    if (!config.school_code || !config.api_password) {
      alert('School Code and API Password are required');
      return;
    }

    try {
      setSaving(true);
      await api.put('/schoolpay/config', config);
      alert('Configuration saved successfully');
      setHasConfig(true);
      fetchConfig();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      await api.post('/schoolpay/sync', { from_date: today });
      alert('Connection successful! Transactions synced.');
      fetchConfig();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to connect to SchoolPay');
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookURL = () => {
    navigator.clipboard.writeText(config.webhook_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/finance/schoolpay')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Settings className="w-6 h-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">SchoolPay Configuration</h1>
                </div>
                <p className="text-sm text-gray-600 mt-1">Configure real-time mobile money payment notifications</p>
              </div>
            </div>
            {hasConfig && (
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${config.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {config.is_active ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">What is SchoolPay?</h3>
              <p className="text-sm text-blue-800">SchoolPay is Uganda's leading school payment platform that allows parents to pay school fees via MTN Mobile Money and Airtel Money. This integration enables real-time payment notifications and automatic fee reconciliation.</p>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Code *</label>
              <input
                type="text"
                placeholder="123456"
                value={config.school_code}
                onChange={(e) => setConfig({ ...config, school_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Your unique school code from SchoolPay</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Password *</label>
              <input
                type="password"
                placeholder="Enter your SchoolPay API password"
                value={config.api_password}
                onChange={(e) => setConfig({ ...config, api_password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Your API password from SchoolPay portal (keep this secret)</p>
            </div>

            <div className="border-t border-gray-200 pt-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.webhook_url}
                  readOnly
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={copyWebhookURL}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Copy this URL and register it in your SchoolPay portal</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="webhook_enabled"
                checked={config.webhook_enabled}
                onChange={(e) => setConfig({ ...config, webhook_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <label htmlFor="webhook_enabled" className="text-sm font-medium text-gray-700">Enable Webhook Notifications</label>
                <p className="text-xs text-gray-500">Receive real-time payment notifications from SchoolPay</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={config.is_active}
                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Activate Integration</label>
                <p className="text-xs text-gray-500">Enable SchoolPay integration for this school</p>
              </div>
            </div>

            {config.last_sync_at && (
              <p className="text-sm text-gray-500">Last synced: {new Date(config.last_sync_at).toLocaleString()}</p>
            )}

            <div className="flex justify-end gap-3 pt-4">
              {hasConfig && (
                <button
                  onClick={handleTestConnection}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Test Connection
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Setup Instructions</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Step 1: Get SchoolPay Credentials</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>1. Login to your SchoolPay school portal at <a href="https://schoolpay.co.ug" target="_blank" className="text-blue-600 hover:underline">schoolpay.co.ug</a></li>
                <li>2. Navigate to Settings → API Configuration</li>
                <li>3. Copy your School Code and API Password</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Step 2: Configure Acadistra</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>1. Enter your School Code and API Password above</li>
                <li>2. Enable webhook notifications</li>
                <li>3. Activate the integration</li>
                <li>4. Click "Save Configuration"</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Webhook className="w-4 h-4 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Step 3: Register Webhook in SchoolPay</h3>
              </div>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>1. Copy the Webhook URL from above</li>
                <li>2. Go to SchoolPay portal → Settings → Webhooks</li>
                <li>3. Paste the webhook URL</li>
                <li>4. Enable webhook notifications</li>
                <li>5. Save the settings</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Step 4: Test the Integration</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>1. Click "Test Connection" button above</li>
                <li>2. Make a test payment via SchoolPay</li>
                <li>3. Check the Transactions page to verify payment received</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Important Notes</h3>
              <ul className="space-y-1 text-sm text-yellow-800">
                <li>• Ensure student admission numbers match SchoolPay payment codes for automatic matching</li>
                <li>• Webhook URL must be publicly accessible (not localhost)</li>
                <li>• Keep your API password secure and never share it</li>
                <li>• SchoolPay subscription must be active for webhooks to work</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
