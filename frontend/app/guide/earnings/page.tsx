'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { formatNPR } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Wallet, TrendingUp, CheckCircle, Clock, Banknote,
  AlertCircle, RefreshCw, Loader2, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── types ──────────────────────────────────────────────────── */
interface Commission {
  _id: string;
  booking: {
    _id: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    status: string;
    completedAt?: string;
  };
  bookingAmount:   number;
  commissionRate:  number;
  commissionAmount:number;
  guideEarning:    number;
  status:          'pending' | 'paid_out';
  createdAt:       string;
}
interface Payout {
  _id:       string;
  totalAmount: number;
  status:    'pending' | 'processing' | 'paid' | 'failed';
  paymentMethod?: string;
  transactionReference?: string;
  notes?:    string;
  payoutDate?: string;
  createdAt: string;
}
interface PayoutMeta {
  payouts:               Payout[];
  pendingBalance:        number;
  pendingCommissionCount:number;
  hasActivePayout:       boolean;
}

/* ─── helpers ────────────────────────────────────────────────── */
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' }) : '—';

const PAYOUT_STATUS: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Awaiting Admin', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  processing: { label: 'Processing',    cls: 'bg-blue-100 text-blue-700 border-blue-200'   },
  paid:       { label: 'Paid',          cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  failed:     { label: 'Failed',        cls: 'bg-red-100 text-red-700 border-red-200'       },
};

const COMMISSION_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'esewa',         label: 'eSewa'         },
  { value: 'cash',          label: 'Cash'          },
];

/* ─── component ──────────────────────────────────────────────── */
export default function GuideEarningsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [meta,        setMeta]        = useState<PayoutMeta | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  // payout request dialog
  const [dialog,      setDialog]      = useState(false);
  const [payMethod,   setPayMethod]   = useState('bank_transfer');
  const [payNotes,    setPayNotes]    = useState('');
  const [requesting,  setRequesting]  = useState(false);

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [comRes, metaRes] = await Promise.all([
        api.get('/commissions/my'),
        api.get('/payouts/my'),
      ]);
      setCommissions(comRes.data.data ?? []);
      setMeta(metaRes.data.data ?? null);
    } catch { toast.error('Failed to load earnings data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRequestPayout = async () => {
    setRequesting(true);
    try {
      const r = await api.post('/payouts/request', { paymentMethod: payMethod, notes: payNotes });
      toast.success(r.data.message ?? 'Payout request submitted!');
      setDialog(false);
      setPayNotes('');
      await fetchAll(true);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to submit payout request');
    } finally { setRequesting(false); }
  };

  /* ── derived stats ── */
  const totalEarned   = commissions.reduce((s, c) => s + c.guideEarning, 0);
  const totalPaidOut  = commissions.filter(c => c.status === 'paid_out').reduce((s, c) => s + c.guideEarning, 0);
  const avgRate       = commissions.length
    ? (commissions.reduce((s, c) => s + c.commissionRate, 0) / commissions.length) * 100
    : 0;

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid sm:grid-cols-3 gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">

      {/* ── header ── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
          <p className="text-sm text-muted-foreground mt-1">Net earnings after platform commission</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchAll(true)} disabled={refreshing} className="gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {/* ── summary cards ── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Net Earnings', value: formatNPR(totalEarned),   icon: Wallet,    grad: 'from-emerald-600 to-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', ring: 'ring-emerald-200' },
          { label: 'Pending Payout',     value: formatNPR(meta?.pendingBalance ?? 0), icon: Clock, grad: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/30', ring: 'ring-amber-200' },
          { label: 'Total Paid Out',     value: formatNPR(totalPaidOut),  icon: CheckCircle, grad: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-950/30', ring: 'ring-blue-200' },
        ].map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className={`border-0 ring-1 ${c.ring} ${c.bg} shadow-sm`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.grad} shadow`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">{c.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── payout request banner ── */}
      {meta && meta.pendingBalance > 0 && (
        <Card className={`border ${meta.hasActivePayout ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20'}`}>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <Banknote className={`h-6 w-6 shrink-0 ${meta.hasActivePayout ? 'text-blue-600' : 'text-emerald-600'}`} />
              <div>
                <p className="font-semibold text-sm">
                  {meta.hasActivePayout ? 'Payout request is being processed' : `${formatNPR(meta.pendingBalance)} available for payout`}
                </p>
                <p className="text-xs text-muted-foreground">
                  From {meta.pendingCommissionCount} paid {meta.pendingCommissionCount === 1 ? 'trip' : 'trips'}
                  {meta.hasActivePayout && ' · Admin will process shortly'}
                </p>
              </div>
            </div>
            {!meta.hasActivePayout && (
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={() => setDialog(true)}>
                Request Payout
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── commission table ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Commission Breakdown
            <Badge variant="secondary" className="ml-auto text-xs">{commissions.length} records</Badge>
          </CardTitle>
          {avgRate > 0 && (
            <p className="text-xs text-muted-foreground">Platform avg. rate: {avgRate.toFixed(1)}%</p>
          )}
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground text-sm">
              No commission records yet. Confirm payment for your first trip to see earnings here.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {commissions.map(c => (
                <div key={c._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border/50 bg-muted/20 p-3.5">
                  <div>
                    <p className="text-sm font-semibold">
                      Trip: {fmt(c.booking.startDate)} — {fmt(c.booking.endDate)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Booking: {formatNPR(c.bookingAmount)} · Platform {(c.commissionRate * 100).toFixed(1)}% = {formatNPR(c.commissionAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    <div className="text-right">
                      <p className="text-base font-bold text-emerald-600">{formatNPR(c.guideEarning)}</p>
                      <p className="text-[10px] text-muted-foreground">your earning</p>
                    </div>
                    <Badge className={`border text-xs ${c.status === 'paid_out' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {c.status === 'paid_out' ? <><CheckCircle className="h-3 w-3 mr-1" />Paid Out</> : <><Clock className="h-3 w-3 mr-1" />Pending</>}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── payout history ── */}
      {meta && meta.payouts.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />Payout History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {meta.payouts.map(p => {
                const s = PAYOUT_STATUS[p.status] ?? PAYOUT_STATUS.pending;
                return (
                  <div key={p._id} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3.5">
                    <div>
                      <p className="text-sm font-semibold">{formatNPR(p.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.paymentMethod ?? 'Bank transfer'}
                        {p.transactionReference && ` · Ref: ${p.transactionReference}`}
                        {p.payoutDate && ` · ${fmt(p.payoutDate)}`}
                      </p>
                      {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
                    </div>
                    <Badge className={`border text-xs ${s.cls}`}>{s.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── payout info callout ── */}
      <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-4 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="text-muted-foreground">
          <p className="font-medium text-foreground mb-0.5">How payouts work</p>
          <p>Once payment is confirmed, your net earning (after the platform commission) is recorded here as "Pending". Click <strong>Request Payout</strong> to notify admin. Payouts are processed within 3–5 business days.</p>
        </div>
      </div>

      {/* ── request payout dialog ── */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              You are requesting a payout of{' '}
              <strong>{formatNPR(meta?.pendingBalance ?? 0)}</strong> from{' '}
              {meta?.pendingCommissionCount} paid trip{meta?.pendingCommissionCount !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {COMMISSION_METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPayMethod(m.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${payMethod === m.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes for admin (optional)</label>
              <Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)}
                placeholder="e.g. My eSewa number is 98XXXXXXXX" rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleRequestPayout} disabled={requesting}>
              {requesting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
                : <><ArrowRight className="h-4 w-4 mr-2" />Submit Request</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
