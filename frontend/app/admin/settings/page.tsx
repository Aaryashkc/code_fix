'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Database,
  CreditCard,
  Percent,
  Activity,
  Globe,
  Lock,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

type SettingsState = {
  siteName: string;
  siteEmail: string;
  timezone: string;
  currency: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  emailVerification: boolean;
  paymentGateway: string;
  maxBookingDays: number;
  autoConfirmBookings: boolean;
  defaultCommissionRate: number;
  snackBufferDistanceKm: number;
};

const DEFAULT_SETTINGS: SettingsState = {
  siteName: 'Yatra Nepal',
  siteEmail: 'info@yatra.com.np',
  timezone: 'Asia/Kathmandu',
  currency: 'NPR',
  maintenanceMode: false,
  allowRegistration: true,
  emailVerification: true,
  paymentGateway: 'esewa',
  maxBookingDays: 30,
  autoConfirmBookings: false,
  defaultCommissionRate: 0.15,
  snackBufferDistanceKm: 5
};

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await api.get('/settings');
        if (response.data?.success) {
          const data = response.data.data;
          const mappedSettings: SettingsState = {
            siteName: data.siteName ?? 'Yatra Nepal',
            siteEmail: data.siteEmail ?? 'info@yatra.com.np',
            timezone: data.timezone ?? 'Asia/Kathmandu',
            currency: data.currency ?? 'NPR',
            maintenanceMode: data.maintenanceMode ?? false,
            allowRegistration: data.allowRegistration ?? true,
            emailVerification: data.emailVerification ?? true,
            paymentGateway: data.paymentGateway ?? 'esewa',
            maxBookingDays: data.maxBookingDays ?? 30,
            autoConfirmBookings: data.autoConfirmBookings ?? false,
            defaultCommissionRate: data.defaultCommissionRate ?? 0.15,
            snackBufferDistanceKm: data.snackBufferDistanceKm ?? 5,
          };
          setSettings(mappedSettings);
          setSavedSettings(mappedSettings);
        }
      } catch (error) {
        toast.error('Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/settings', settings);
      if (response.data?.success) {
        const data = response.data.data;
        const mappedSettings: SettingsState = {
          siteName: data.siteName ?? 'Yatra Nepal',
          siteEmail: data.siteEmail ?? 'info@yatra.com.np',
          timezone: data.timezone ?? 'Asia/Kathmandu',
          currency: data.currency ?? 'NPR',
          maintenanceMode: data.maintenanceMode ?? false,
          allowRegistration: data.allowRegistration ?? true,
          emailVerification: data.emailVerification ?? true,
          paymentGateway: data.paymentGateway ?? 'esewa',
          maxBookingDays: data.maxBookingDays ?? 30,
          autoConfirmBookings: data.autoConfirmBookings ?? false,
          defaultCommissionRate: data.defaultCommissionRate ?? 0.15,
          snackBufferDistanceKm: data.snackBufferDistanceKm ?? 5,
        };
        setSettings(mappedSettings);
        setSavedSettings(mappedSettings);
        toast.success('Settings updated successfully');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(savedSettings);
    toast.success('Changes discarded successfully');
  };

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const tabs = [
    { id: 'general', label: 'Branding & Localization', desc: 'Site metadata & region configurations', icon: Settings },
    { id: 'security', label: 'Security & Access', desc: 'Maintenance mode & account regulations', icon: Shield },
    { id: 'payments', label: 'Billing & Transactions', desc: 'Booking limits & payment providers', icon: CreditCard },
    { id: 'rates', label: 'System Default Rates', desc: 'Commission splits & route buffer scanning', icon: Percent },
    { id: 'system', label: 'System Diagnostics', desc: 'Database connections & environment stats', icon: Database }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-6">
              <Globe className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-semibold text-foreground">Branding & Localization</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Site Name</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({...settings, siteName: e.target.value})}
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition"
                  placeholder="e.g. Yatra Nepal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Site Support Email</label>
                <input
                  type="email"
                  value={settings.siteEmail}
                  onChange={(e) => setSettings({...settings, siteEmail: e.target.value})}
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition"
                  placeholder="e.g. support@yatra.com.np"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Preferred Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition"
                >
                  <option value="Asia/Kathmandu">Asia/Kathmandu (UTC +5:45)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">System Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({...settings, currency: e.target.value})}
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition"
                >
                  <option value="NPR">NPR (Nepalese Rupee - ₨)</option>
                  <option value="USD">USD (US Dollar - $)</option>
                  <option value="EUR">EUR (Euro - €)</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-6">
              <Lock className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-semibold text-foreground">Security & Access Management</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:bg-slate-50/20 transition-colors">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-foreground">System Maintenance Mode</h4>
                  <p className="text-xs text-muted-foreground max-w-lg">
                    Temporarily restrict public access to the platform. Admins will retain backend and dashboard control.
                  </p>
                </div>
                <Switch 
                  checked={settings.maintenanceMode} 
                  onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})} 
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:bg-slate-50/20 transition-colors">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-foreground">Allow Public Registration</h4>
                  <p className="text-xs text-muted-foreground max-w-lg">
                    Enable or disable the sign-up options for tourists and prospective guides across platforms.
                  </p>
                </div>
                <Switch 
                  checked={settings.allowRegistration} 
                  onCheckedChange={(checked) => setSettings({...settings, allowRegistration: checked})} 
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:bg-slate-50/20 transition-colors">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-foreground">Mandatory Email Verification</h4>
                  <p className="text-xs text-muted-foreground max-w-lg">
                    Require new sign-ups to confirm their email address via OTP before unlocking platform features.
                  </p>
                </div>
                <Switch 
                  checked={settings.emailVerification} 
                  onCheckedChange={(checked) => setSettings({...settings, emailVerification: checked})} 
                />
              </div>
            </div>
          </div>
        );
      
      case 'payments':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-6">
              <DollarSign className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-semibold text-foreground">Billing & Booking Configurations</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Primary Payment Gateway</label>
                <select
                  value={settings.paymentGateway}
                  onChange={(e) => setSettings({...settings, paymentGateway: e.target.value})}
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition"
                >
                  <option value="esewa">eSewa Nepal</option>
                  <option value="khalti">Khalti Wallet</option>
                  <option value="stripe">Stripe Card Platform</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Max Booking Window Days</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.maxBookingDays}
                  onChange={(e) => setSettings({...settings, maxBookingDays: parseInt(e.target.value) || 30})}
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition"
                  placeholder="30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:bg-slate-50/20 transition-colors">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold text-foreground">Auto-Confirm Bookings</h4>
                <p className="text-xs text-muted-foreground max-w-lg">
                  Automatically set booking status to "confirmed" the moment payment verification hook finishes.
                </p>
              </div>
              <Switch 
                checked={settings.autoConfirmBookings} 
                onCheckedChange={(checked) => setSettings({...settings, autoConfirmBookings: checked})} 
              />
            </div>
          </div>
        );

      case 'rates':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-6">
              <Percent className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-semibold text-foreground">Platform Rates & Buffers</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Global Commission Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(settings.defaultCommissionRate * 100)}
                    onChange={(e) => setSettings({
                      ...settings,
                      defaultCommissionRate: (parseFloat(e.target.value) || 0) / 100
                    })}
                    className="w-full pl-3.5 pr-8 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition"
                    placeholder="15"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground font-semibold">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The default percentage cut taken by the platform on all booking transactions.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Snack Buffer Scan Distance (km)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={settings.snackBufferDistanceKm}
                    onChange={(e) => setSettings({
                      ...settings,
                      snackBufferDistanceKm: parseFloat(e.target.value) || 5
                    })}
                    className="w-full pl-3.5 pr-10 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition"
                    placeholder="5"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground font-semibold">km</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The buffer radius scanned along route polylines to locate and suggest local snack stops.
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'system':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-6">
              <Database className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-semibold text-foreground">System Diagnostics</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border/60 bg-slate-50/5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Database Core</h4>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                  <span className="text-muted-foreground">Engine:</span>
                  <span className="font-semibold text-foreground text-right">MongoDB Atlas Cluster</span>
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-semibold text-foreground text-right">Mongoose ODM 9.1</span>
                  <span className="text-muted-foreground">Connection Status:</span>
                  <span className="font-semibold text-emerald-500 flex items-center justify-end gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    Online & Stable
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-slate-50/5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Server & Runtime Environment</h4>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                  <span className="text-muted-foreground">Platform Version:</span>
                  <span className="font-semibold text-foreground text-right">1.0.0 (Production-Grade)</span>
                  <span className="text-muted-foreground">Gateway:</span>
                  <span className="font-semibold text-foreground text-right">Express v5 + CORS Node</span>
                  <span className="text-muted-foreground">Active Environment:</span>
                  <span className="font-semibold text-amber-500 text-right capitalize">
                    {process.env.NODE_ENV || 'development'}
                  </span>
                  <span className="text-muted-foreground">Real-time Sockets:</span>
                  <span className="font-semibold text-indigo-500 flex items-center justify-end gap-1.5">
                    <Activity className="h-4 w-4 animate-pulse inline" /> Socket.io Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-20">
        <div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-8 w-44" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-3">
            {[1, 2, 3, 4, 5].map((idx) => (
              <Skeleton key={idx} className="h-14 w-full rounded-xl" />
            ))}
          </div>
          <div className="md:col-span-3">
            <GlassCard className="p-8">
              <Skeleton className="h-6 w-40 mb-6" />
              <div className="grid grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-24">
      {/* Header */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin · Control Panel</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure site branding, active gateways, security modes, and system splits.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar Card */}
        <div className="md:col-span-1 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-start gap-3.5 p-4 rounded-xl text-left border transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-card border-border/70 text-foreground hover:bg-slate-50/40 hover:border-border'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight uppercase tracking-wider">{tab.label}</h4>
                  <p className={`text-[10px] mt-0.5 leading-normal ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Form Card */}
        <div className="md:col-span-3">
          <GlassCard className="p-8 shadow-sm">
            <div className="animate-in fade-in duration-300">
              {renderTabContent()}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Elegant Floating Unsaved Changes Bar */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-6 px-6 py-4 bg-background/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl w-[90%] max-w-2xl"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-xs md:text-sm font-semibold text-foreground">
                You have unsaved changes!
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={saving}
                className="text-muted-foreground hover:text-foreground h-9 text-xs"
              >
                Discard
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md h-9 text-xs"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

