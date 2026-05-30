'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { formatNPR } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AdminPortalSkeleton } from '@/components/ui/skeleton-cards';
import { 
  Percent, 
  Coins, 
  TrendingUp, 
  Users, 
  RefreshCw, 
  Calendar, 
  Settings, 
  ChevronRight,
  Info,
  Sliders,
} from 'lucide-react';

interface GuideStats {
  _id: string;
  totalCommission: number;
  totalEarnings: number;
  totalBookings: number;
  avgRate: number;
  pendingAmount: number;
  guide: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    commissionRate?: number | null;
  };
}

interface CommissionDashboardData {
  totals: {
    platformCommission: number;
    guideEarnings: number;
    totalBookingVolume: number;
    commissionCount: number;
    averageRate: number;
  };
  perGuide: GuideStats[];
}

interface GlobalSettings {
  defaultCommissionRate: number;
  snackBufferDistanceKm: number;
}

export default function AdminCommissionsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<CommissionDashboardData | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Global Settings Settings
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    defaultCommissionRate: 0.15,
    snackBufferDistanceKm: 5,
  });
  const [savingGlobalSettings, setSavingGlobalSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Edit Guide Override Modal State
  const [selectedGuide, setSelectedGuide] = useState<GuideStats | null>(null);
  const [overrideRateInput, setOverrideRateInput] = useState('');
  const [useGlobalDefault, setUseGlobalDefault] = useState(true);
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);

  // Fetch Dashboard
  const fetchDashboard = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    else setLoading(true);
    
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/commissions/dashboard', { params });
      if (response.data?.success) {
        setDashboardData(response.data.data);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading dashboard',
        description: error.response?.data?.message || 'Something went wrong.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate, toast]);

  // Fetch Global Settings
  const fetchGlobalSettings = useCallback(async () => {
    try {
      const response = await api.get('/commissions/global-rate');
      if (response.data?.success) {
        setGlobalSettings({
          defaultCommissionRate: response.data.data.defaultCommissionRate ?? 0.15,
          snackBufferDistanceKm: response.data.data.snackBufferDistanceKm ?? 5,
        });
      }
    } catch (error: any) {
      console.error('Failed to load global commission rate', error);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchGlobalSettings();
  }, [fetchDashboard, fetchGlobalSettings]);

  // Update Global Settings
  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGlobalSettings(true);
    try {
      const response = await api.put('/commissions/global-rate', {
        defaultCommissionRate: globalSettings.defaultCommissionRate,
        snackBufferDistanceKm: globalSettings.snackBufferDistanceKm
      });
      
      if (response.data?.success) {
        toast({
          title: 'Settings updated',
          description: 'Global default commission rate and buffer distance saved successfully.'
        });
        setSettingsOpen(false);
        await fetchGlobalSettings();
        await fetchDashboard(); // Refresh stats
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to save settings',
        description: error.response?.data?.message || 'Try again later.'
      });
    } finally {
      setSavingGlobalSettings(false);
    }
  };

  // Open Override Modal
  const openOverrideModal = (guideStat: GuideStats) => {
    setSelectedGuide(guideStat);
    const hasOverride = guideStat.guide.commissionRate !== undefined && guideStat.guide.commissionRate !== null;
    setUseGlobalDefault(!hasOverride);
    setOverrideRateInput(
      hasOverride 
        ? (Number(guideStat.guide.commissionRate) * 100).toString() 
        : (globalSettings.defaultCommissionRate * 100).toString()
    );
    setOverrideModalOpen(true);
  };

  // Save Guide Override
  const handleSaveOverride = async () => {
    if (!selectedGuide) return;
    
    setSavingOverride(true);
    try {
      let finalRate: number | null = null;
      if (!useGlobalDefault) {
        const rateVal = parseFloat(overrideRateInput);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
          toast({
            variant: 'destructive',
            title: 'Invalid rate',
            description: 'Please enter a percentage between 0% and 100%.'
          });
          setSavingOverride(false);
          return;
        }
        finalRate = rateVal / 100;
      }
      
      const response = await api.put(`/commissions/guide/${selectedGuide.guide._id}/rate`, {
        rate: finalRate
      });
      
      if (response.data?.success) {
        toast({
          title: 'Commission override saved',
          description: response.data.message
        });
        setOverrideModalOpen(false);
        fetchDashboard(); // Reload breakdown
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update rate',
        description: error.response?.data?.message || 'Try again later.'
      });
    } finally {
      setSavingOverride(false);
    }
  };

  if (loading) {
    return <AdminPortalSkeleton />;
  }

  const totals = dashboardData?.totals || {
    platformCommission: 0,
    guideEarnings: 0,
    totalBookingVolume: 0,
    commissionCount: 0,
    averageRate: 0
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page header */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin · Revenue</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Commissions</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Configure system splits, override commission rates for guides, and track platform earnings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              System Settings
            </Button>
            <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => fetchDashboard(true)} disabled={refreshing}>
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Date Filters Card */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-end gap-4">
          <div className="grid gap-1.5 w-full sm:w-auto">
            <Label htmlFor="start-date" className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Calendar className="h-3 w-3" /> Start Date</Label>
            <Input
              id="start-date"
              type="date"
              className="h-9 w-full sm:w-[180px]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5 w-full sm:w-auto">
            <Label htmlFor="end-date" className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Calendar className="h-3 w-3" /> End Date</Label>
            <Input
              id="end-date"
              type="date"
              className="h-9 w-full sm:w-[180px]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => fetchDashboard()} variant="default" className="h-9 font-medium shadow-sm flex-1 sm:flex-none">
              Apply Filters
            </Button>
            {(startDate || endDate) && (
              <Button 
                onClick={() => { setStartDate(''); setEndDate(''); }} 
                variant="ghost" 
                className="h-9 font-medium"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-indigo-500" /> Platform Cuts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">{formatNPR(totals.platformCommission)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Across {totals.commissionCount} paid bookings
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-500" /> Guide Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatNPR(totals.guideEarnings)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Guide shares from bookings
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> Booking Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatNPR(totals.totalBookingVolume)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Gross paid transaction value
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-amber-500" /> Average Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{totals.averageRate.toFixed(1)}%</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Effective global commission rate
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm sm:col-span-2 xl:col-span-1 bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-indigo-600" /> System Defaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground">
              Split: {(globalSettings.defaultCommissionRate * 100).toFixed(0)}%
            </p>
            <p className="mt-0.5 text-xs text-indigo-700">
              Snack Buffer: {globalSettings.snackBufferDistanceKm} km
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Main Content Breakdowns */}
      <div className="grid gap-6">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Per-Guide Commission & Balance Breakdown</CardTitle>
            <CardDescription>
              Monitor the booking volumes, commission payouts, and set custom commission splits for each individual guide.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!dashboardData?.perGuide || dashboardData.perGuide.length === 0) ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border/60 text-muted-foreground">
                <Info className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                No guide commission data found for the selected timeframe.
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold">Guide</TableHead>
                      <TableHead className="font-semibold text-center">Bookings</TableHead>
                      <TableHead className="font-semibold text-right">Total Booking Vol</TableHead>
                      <TableHead className="font-semibold text-right text-indigo-600">Platform Comm.</TableHead>
                      <TableHead className="font-semibold text-right text-emerald-600">Guide Share</TableHead>
                      <TableHead className="font-semibold text-right text-amber-600">Unpaid Balance</TableHead>
                      <TableHead className="font-semibold text-center">Applied Split Rate</TableHead>
                      <TableHead className="font-semibold text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.perGuide.map((g) => {
                      const totalVol = g.totalCommission + g.totalEarnings;
                      const hasOverride = g.guide.commissionRate !== undefined && g.guide.commissionRate !== null;
                      return (
                        <TableRow key={g._id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-slate-100">
                                <AvatarImage src={g.guide.avatar} alt={g.guide.name} />
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-xs">
                                  {g.guide.name ? g.guide.name.split(' ').map(n=>n[0]).join('') : 'G'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm text-foreground leading-none">{g.guide.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{g.guide.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-center font-medium">{g.totalBookings}</TableCell>
                          
                          <TableCell className="text-right font-medium">{formatNPR(totalVol)}</TableCell>
                          
                          <TableCell className="text-right font-semibold text-indigo-600">{formatNPR(g.totalCommission)}</TableCell>
                          
                          <TableCell className="text-right font-semibold text-emerald-600">{formatNPR(g.totalEarnings)}</TableCell>
                          
                          <TableCell className="text-right font-bold text-amber-600">{formatNPR(g.pendingAmount)}</TableCell>
                          
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                hasOverride 
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                  : 'bg-slate-100 text-foreground border border-border/60'
                              }`}>
                                {((g.guide.commissionRate ?? globalSettings.defaultCommissionRate) * 100).toFixed(0)}%
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                {hasOverride ? 'Custom Override' : 'Global Default'}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 gap-1 font-medium hover:bg-muted text-foreground"
                              onClick={() => openOverrideModal(g)}
                            >
                              Edit Split <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global Config Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSaveGlobalSettings}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5"><Settings className="h-5 w-5 text-indigo-600" /> Platform Configuration</DialogTitle>
              <DialogDescription>
                Modify system settings affecting global commission splits and trip optimization parameters.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="default-rate" className="text-sm font-semibold">Global Commission Split (%)</Label>
                <div className="relative">
                  <Input
                    id="default-rate"
                    type="number"
                    min="0"
                    max="100"
                    className="pr-8"
                    value={Math.round(globalSettings.defaultCommissionRate * 100)}
                    onChange={(e) => setGlobalSettings({
                      ...globalSettings,
                      defaultCommissionRate: Number(e.target.value) / 100
                    })}
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-muted-foreground font-semibold">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Platform split percentage taken from paid booking prices by default.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="snack-buffer" className="text-sm font-semibold">Snack Search Route Buffer (km)</Label>
                <div className="relative">
                  <Input
                    id="snack-buffer"
                    type="number"
                    min="0.5"
                    max="50"
                    step="0.5"
                    className="pr-10"
                    value={globalSettings.snackBufferDistanceKm}
                    onChange={(e) => setGlobalSettings({
                      ...globalSettings,
                      snackBufferDistanceKm: Number(e.target.value)
                    })}
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-muted-foreground font-semibold">km</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The buffer distance along a route polyline used to scan and query snack stops.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingGlobalSettings}>
                {savingGlobalSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Guide Override Split Rate Dialog */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5"><Sliders className="h-5 w-5 text-indigo-600" /> Guide Commission Split</DialogTitle>
            <DialogDescription>
              Assign a customized platform commission rate for {selectedGuide?.guide.name}.
            </DialogDescription>
          </DialogHeader>

          {selectedGuide && (
            <div className="space-y-5 py-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <Avatar className="h-10 w-10 border border-slate-100">
                  <AvatarImage src={selectedGuide.guide.avatar} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-xs">
                    {selectedGuide.guide.name ? selectedGuide.guide.name.split(' ').map(n=>n[0]).join('') : 'G'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground leading-none">{selectedGuide.guide.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedGuide.guide.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2 p-2 bg-indigo-50/40 border border-indigo-50/70 rounded-xl">
                <div className="space-y-0.5">
                  <Label htmlFor="use-global" className="text-sm font-semibold cursor-pointer">Use Platform Default Split</Label>
                  <p className="text-xs text-muted-foreground">
                    Use global system rate: {(globalSettings.defaultCommissionRate * 100).toFixed(0)}%
                  </p>
                </div>
                <input 
                  type="checkbox"
                  id="use-global"
                  className="h-4.5 w-4.5 accent-indigo-600 rounded cursor-pointer"
                  checked={useGlobalDefault}
                  onChange={(e) => setUseGlobalDefault(e.target.checked)}
                />
              </div>

              {!useGlobalDefault && (
                <div className="space-y-1.5 animate-fadeIn">
                  <Label htmlFor="custom-rate" className="text-sm font-semibold">Custom Split Rate (%)</Label>
                  <div className="relative">
                    <Input
                      id="custom-rate"
                      type="number"
                      min="0"
                      max="100"
                      className="pr-8"
                      value={overrideRateInput}
                      onChange={(e) => setOverrideRateInput(e.target.value)}
                      required={!useGlobalDefault}
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground font-semibold">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Specific commission split applied only for this guide's paid bookings.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOverride} disabled={savingOverride}>
              {savingOverride ? 'Saving...' : 'Apply Split Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
