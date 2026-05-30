'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { formatNPR } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPortalSkeleton } from '@/components/ui/skeleton-cards';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  FileDown,
  RefreshCw,
  Search,
  AlertCircle,
  PlusCircle,
  User,
  Info,
  Calendar,
  CreditCard,
  Hash
} from 'lucide-react';

interface PendingPayoutGuide {
  _id: string;
  pendingAmount: number;
  commissionCount: number;
  oldestPending: string;
  guide: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface PendingPayoutsData {
  totalPending: number;
  guides: PendingPayoutGuide[];
}

interface PayoutRecord {
  _id: string;
  guide: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  commissions: string[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  paymentMethod: string;
  transactionReference: string;
  payoutDate?: string;
  notes?: string;
  processedBy?: {
    name: string;
  };
  createdAt: string;
}

interface PayoutHistoryResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: PayoutRecord[];
}

const statusBadgeClasses: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  esewa: 'eSewa',
  khalti: 'Khalti',
  cash: 'Cash',
};

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data States
  const [pendingData, setPendingData] = useState<PendingPayoutsData | null>(null);
  const [historyData, setHistoryData] = useState<PayoutRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State for Processing Payout
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<PendingPayoutGuide | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);

  // Modal State for Updating Payout Status
  const [updateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [newStatus, setNewStatus] = useState<'pending' | 'processing' | 'paid' | 'failed'>('paid');
  const [statusTxRef, setStatusTxRef] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch Pending Payouts
  const fetchPendingPayouts = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get('/payouts/pending');
      if (response.data?.success) {
        setPendingData(response.data.data);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load pending payouts',
        description: error.response?.data?.message || 'Try again later.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Fetch Payout History
  const fetchPayoutHistory = useCallback(async (page = 1, showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const params: Record<string, any> = { page, limit: 15 };
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get<PayoutHistoryResponse>('/payouts/history', { params });
      if (response.data?.success) {
        setHistoryData(response.data.data);
        setHistoryPage(response.data.page);
        setHistoryTotalPages(response.data.pages);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load payout history',
        description: error.response?.data?.message || 'Try again later.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, toast]);

  // Initial Fetch & Tab Handling
  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingPayouts();
    } else {
      fetchPayoutHistory(1);
    }
  }, [activeTab, fetchPendingPayouts, fetchPayoutHistory]);

  // Refresh Trigger
  const handleRefresh = () => {
    if (activeTab === 'pending') {
      fetchPendingPayouts(true);
    } else {
      fetchPayoutHistory(historyPage, true);
    }
  };

  // Open Process Modal
  const openProcessModal = (g: PendingPayoutGuide) => {
    setSelectedGuide(g);
    setPaymentMethod('bank_transfer');
    setTransactionRef('');
    setNotes('');
    setProcessModalOpen(true);
  };

  // Submit Payout
  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuide) return;

    setProcessingPayout(true);
    try {
      const response = await api.post('/payouts', {
        guideId: selectedGuide.guide._id,
        paymentMethod,
        transactionReference: transactionRef,
        notes
      });

      if (response.data?.success) {
        toast({
          title: 'Payout processed',
          description: response.data.message
        });
        setProcessModalOpen(false);
        fetchPendingPayouts(); // Reload list
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to process payout',
        description: error.response?.data?.message || 'Something went wrong.'
      });
    } finally {
      setProcessingPayout(false);
    }
  };

  // Open Status Update Modal
  const openUpdateStatusModal = (payout: PayoutRecord) => {
    setSelectedPayout(payout);
    setNewStatus(payout.status === 'processing' ? 'paid' : payout.status);
    setStatusTxRef(payout.transactionReference || '');
    setStatusNotes(payout.notes || '');
    setUpdateStatusModalOpen(true);
  };

  // Save Status Update
  const handleSaveStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;

    setUpdatingStatus(true);
    try {
      const response = await api.put(`/payouts/${selectedPayout._id}/status`, {
        status: newStatus,
        transactionReference: statusTxRef,
        notes: statusNotes
      });

      if (response.data?.success) {
        toast({
          title: 'Payout status updated',
          description: response.data.message
        });
        setUpdateStatusModalOpen(false);
        fetchPayoutHistory(historyPage); // Reload list
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update status',
        description: error.response?.data?.message || 'Something went wrong.'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Download Payout Summary CSV
  const handleDownloadCSV = async () => {
    try {
      toast({
        title: 'Generating report...',
        description: 'Preparing your payout CSV download.'
      });
      
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await api.get('/payouts/download', {
        params,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payout-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'Could not export payout CSV. Try again later.'
      });
    }
  };

  if (loading && !refreshing) {
    return <AdminPortalSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page header */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin · Finance</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Guide Payouts</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Disburse pending guide earnings, update transaction histories, and download accounting summaries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleDownloadCSV}>
              <FileDown className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs System */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-1">
          <TabsList>
            <TabsTrigger value="pending">Pending Payouts</TabsTrigger>
            <TabsTrigger value="history">Payout History</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Pending Payouts */}
        <TabsContent value="pending" className="space-y-6 focus-visible:outline-none">
          {/* Unpaid Balance Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Outstanding Liability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{formatNPR(pendingData?.totalPending || 0)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Unpaid guide earnings currently held
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-500" /> Guides Unpaid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-indigo-600">{pendingData?.guides?.length || 0}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Guides waiting for disbursements
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-500" /> Commission Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">
                  {pendingData?.guides?.reduce((sum, g) => sum + g.commissionCount, 0) || 0}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Individual commissions pending
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Unpaid Commissions Queue</CardTitle>
              <CardDescription>
                Guides with paid trips and pending balances. Review the balances and disburse payouts in batches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!pendingData?.guides || pendingData.guides.length === 0) ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-border/60 text-muted-foreground">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                  All payouts are up to date! There are no pending commissions.
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Guide</TableHead>
                        <TableHead className="font-semibold text-center">Unpaid Trips</TableHead>
                        <TableHead className="font-semibold text-right">Oldest Pending Commission</TableHead>
                        <TableHead className="font-semibold text-right text-amber-600">Total Pending Payout</TableHead>
                        <TableHead className="font-semibold text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingData.guides.map((g) => (
                        <TableRow key={g._id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-slate-100">
                                <AvatarImage src={g.guide.avatar} />
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

                          <TableCell className="text-center font-medium">{g.commissionCount}</TableCell>

                          <TableCell className="text-right text-muted-foreground text-sm">
                            {new Date(g.oldestPending).toLocaleDateString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </TableCell>

                          <TableCell className="text-right font-bold text-amber-600 text-base">
                            {formatNPR(g.pendingAmount)}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="h-8.5 gap-1.5 font-medium shadow-sm"
                              onClick={() => openProcessModal(g)}
                            >
                              <PlusCircle className="h-3.5 w-3.5" /> Disburse Payout
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Payout History */}
        <TabsContent value="history" className="space-y-6 focus-visible:outline-none">
          {/* History Filters */}
          <Card className="border border-border/60 shadow-sm bg-card">
            <CardContent className="p-4 flex flex-col sm:flex-row items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4 w-full sm:w-auto">
                <div className="grid gap-1.5 w-full sm:w-auto">
                  <Label htmlFor="status-filter" className="text-xs text-muted-foreground font-semibold">Filter by Status</Label>
                  <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setTimeout(() => fetchPayoutHistory(1)); }}>
                    <SelectTrigger id="status-filter" className="h-9 w-full sm:w-[160px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Payout Batches History</CardTitle>
              <CardDescription>
                History of all payouts made to guides. Track transfers, manage transaction status updates, and view processed dates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyData.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-border/60 text-muted-foreground">
                  <Info className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  No payout batches found matching the selected filter.
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Payout ID / Date</TableHead>
                        <TableHead className="font-semibold">Guide</TableHead>
                        <TableHead className="font-semibold text-right">Disbursed Amount</TableHead>
                        <TableHead className="font-semibold text-center">Status</TableHead>
                        <TableHead className="font-semibold">Payment Method</TableHead>
                        <TableHead className="font-semibold">Transaction ID/Ref</TableHead>
                        <TableHead className="font-semibold">Processed By</TableHead>
                        <TableHead className="font-semibold text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((p) => (
                        <TableRow key={p._id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div>
                              <p className="font-mono text-xs font-semibold text-muted-foreground">#{p._id.slice(-8).toUpperCase()}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-7 w-7 border border-slate-100">
                                <AvatarImage src={p.guide?.avatar} />
                                <AvatarFallback className="bg-muted text-foreground font-semibold text-[10px]">
                                  {p.guide?.name ? p.guide.name.split(' ').map(n=>n[0]).join('') : 'G'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-xs text-foreground leading-none">{p.guide?.name || 'Deleted Guide'}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{p.guide?.email || ''}</p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-bold text-foreground text-sm">
                            {formatNPR(p.totalAmount)}
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge className={`border capitalize px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClasses[p.status] || 'bg-slate-100 text-foreground'}`}>
                              {p.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-muted-foreground text-xs capitalize">
                            {paymentMethodLabels[p.paymentMethod] || p.paymentMethod}
                          </TableCell>

                          <TableCell className="text-xs text-slate-700 font-mono">
                            {p.transactionReference ? (
                              <span className="truncate max-w-[120px] inline-block">{p.transactionReference}</span>
                            ) : (
                              <span className="text-muted-foreground italic">-</span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {p.processedBy?.name || 'System'}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 px-2 font-medium hover:bg-slate-50"
                              onClick={() => openUpdateStatusModal(p)}
                            >
                              Manage <PlusCircle className="h-3 w-3 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination controls */}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-xs text-muted-foreground">
                    Page {historyPage} of {historyTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={historyPage === 1}
                      onClick={() => fetchPayoutHistory(historyPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={historyPage === historyTotalPages}
                      onClick={() => fetchPayoutHistory(historyPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog 1: Process Payout Form */}
      <Dialog open={processModalOpen} onOpenChange={setProcessModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form onSubmit={handleSubmitPayout}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5"><Banknote className="h-5 w-5 text-indigo-600" /> Disburse Guide Payout</DialogTitle>
              <DialogDescription>
                Create a payout batch and mark pending commissions as processing/paid.
              </DialogDescription>
            </DialogHeader>

            {selectedGuide && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-3">
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
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Amount</p>
                    <p className="text-lg font-bold text-amber-600 mt-0.5">{formatNPR(selectedGuide.pendingAmount)}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pay-method" className="text-sm font-semibold">Payment Channel</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="pay-method" className="w-full">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer / Swift</SelectItem>
                      <SelectItem value="esewa">eSewa Wallet</SelectItem>
                      <SelectItem value="khalti">Khalti Wallet</SelectItem>
                      <SelectItem value="cash">Over-the-Counter Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-ref" className="text-sm font-semibold">Transaction Reference / Reference ID</Label>
                  <div className="relative">
                    <Input
                      id="tx-ref"
                      placeholder="e.g. TXN9827402, Bank Reference No."
                      className="pl-8"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                    />
                    <Hash className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Optional reference key to reconcile payouts with bank or wallet ledgers.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pay-notes" className="text-sm font-semibold">Payment Notes & Remarks</Label>
                  <Textarea
                    id="pay-notes"
                    placeholder="Enter internal details or messages for the guide."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProcessModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={processingPayout}>
                {processingPayout ? 'Processing...' : 'Disburse Payout'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Update Payout Status */}
      <Dialog open={updateStatusModalOpen} onOpenChange={setUpdateStatusModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSaveStatusUpdate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5"><Clock className="h-5 w-5 text-indigo-600" /> Reconcile Payout Batch</DialogTitle>
              <DialogDescription>
                Update status or reference IDs for this payout transaction.
              </DialogDescription>
            </DialogHeader>

            {selectedPayout && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Payout ID:</span><span className="font-mono">#{selectedPayout._id}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Guide Name:</span><span>{selectedPayout.guide?.name || 'Deleted'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Net Disbursed:</span><span className="font-bold text-indigo-600">{formatNPR(selectedPayout.totalAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Current Status:</span><span className="capitalize font-semibold">{selectedPayout.status}</span></div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="update-status" className="text-sm font-semibold">Transaction Status</Label>
                  <Select value={newStatus} onValueChange={(val: any) => setNewStatus(val)}>
                    <SelectTrigger id="update-status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="paid">Paid & Reconciled</SelectItem>
                      <SelectItem value="failed">Failed / Reversed</SelectItem>
                    </SelectContent>
                  </Select>
                  {newStatus === 'failed' && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 border border-red-100 rounded-lg mt-1">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span><strong>Warning:</strong> Marking as Failed deletes the payout record association and returns all included commissions to the Guide's unpaid balance.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status-tx-ref" className="text-sm font-semibold">Transaction Reference ID</Label>
                  <Input
                    id="status-tx-ref"
                    placeholder="e.g. Bank slip number, transaction reference"
                    value={statusTxRef}
                    onChange={(e) => setStatusTxRef(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status-notes" className="text-sm font-semibold">Notes & Remarks</Label>
                  <Textarea
                    id="status-notes"
                    placeholder="Update remarks for this payout transfer."
                    rows={2.5}
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUpdateStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatingStatus}>
                {updatingStatus ? 'Updating...' : 'Save Reconcile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
