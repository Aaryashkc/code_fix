'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Shield, 
  Bell, 
  Database,
  Mail,
  CreditCard,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { toast } from 'sonner';

type SettingsState = {
  siteName: string;
  siteEmail: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  emailVerification: boolean;
  paymentGateway: string;
  currency: string;
  timezone: string;
  maxBookingDays: number;
  autoConfirmBookings: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  siteName: 'Yatra Nepal',
  siteEmail: 'info@yatra.com.np',
  maintenanceMode: false,
  allowRegistration: true,
  emailVerification: true,
  paymentGateway: 'esewa',
  currency: 'NPR',
  timezone: 'Asia/Kathmandu',
  maxBookingDays: 30,
  autoConfirmBookings: false
};

const SETTINGS_STORAGE_KEY = 'admin_settings_v1';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<SettingsState>;
      const hydrated = { ...DEFAULT_SETTINGS, ...parsed };
      setSettings(hydrated);
      setSavedSettings(hydrated);
    } catch {
      // Ignore malformed local setting data and keep defaults.
    }
  }, []);

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'system', label: 'System', icon: Database }
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setSavedSettings(settings);
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSettings(savedSettings);
    toast.success('Unsaved changes discarded');
  };

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({...settings, siteName: e.target.value})}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Site Email</label>
              <input
                type="email"
                value={settings.siteEmail}
                onChange={(e) => setSettings({...settings, siteEmail: e.target.value})}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
              >
                <option value="Asia/Kathmandu">Asia/Kathmandu</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
              >
                <option value="NPR">NPR (Nepalese Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
              </select>
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <h3 className="text-white font-medium">Maintenance Mode</h3>
                <p className="text-slate-400 text-sm">Temporarily disable public access</p>
              </div>
              <button
                onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <h3 className="text-white font-medium">Allow Registration</h3>
                <p className="text-slate-400 text-sm">Enable new user registration</p>
              </div>
              <button
                onClick={() => setSettings({...settings, allowRegistration: !settings.allowRegistration})}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.allowRegistration ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.allowRegistration ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <h3 className="text-white font-medium">Email Verification</h3>
                <p className="text-slate-400 text-sm">Require email verification for new users</p>
              </div>
              <button
                onClick={() => setSettings({...settings, emailVerification: !settings.emailVerification})}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.emailVerification ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.emailVerification ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-white font-medium mb-2">Email Notifications</h3>
              <p className="text-slate-400 text-sm mb-4">Configure system email settings</p>
              <Button variant="outline" className="border-white/20 text-white">
                <Mail className="h-4 w-4 mr-2" />
                Configure Email Settings
              </Button>
            </div>
          </div>
        );
      
      case 'payments':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Payment Gateway</label>
              <select
                value={settings.paymentGateway}
                onChange={(e) => setSettings({...settings, paymentGateway: e.target.value})}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
              >
                <option value="esewa">eSewa</option>
                <option value="khalti">Khalti</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Max Booking Days</label>
              <input
                type="number"
                value={settings.maxBookingDays}
                onChange={(e) => setSettings({...settings, maxBookingDays: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <h3 className="text-white font-medium">Auto-Confirm Bookings</h3>
                <p className="text-slate-400 text-sm">Automatically confirm bookings when payment is received</p>
              </div>
              <button
                onClick={() => setSettings({...settings, autoConfirmBookings: !settings.autoConfirmBookings})}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoConfirmBookings ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.autoConfirmBookings ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );
      
      case 'system':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-white font-medium mb-2">Database Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Database:</span>
                  <span className="text-white">MongoDB Atlas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400">Connected</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-white font-medium mb-2">System Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Version:</span>
                  <span className="text-white">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className="text-white">Development</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800/50 backdrop-blur-sm border-r border-white/10 min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">Settings</h2>
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-slate-400">Manage your application settings</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={loading || !hasUnsavedChanges}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges || loading}
                  variant="outline"
                  className="border-white/20 text-white"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>

            {hasUnsavedChanges && (
              <p className="text-xs text-amber-300 mb-4">You have unsaved changes.</p>
            )}

            <GlassCard className="p-6">
              {renderTabContent()}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
