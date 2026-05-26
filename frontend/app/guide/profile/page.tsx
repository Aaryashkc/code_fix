'use client';

import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Star, MapPin, Banknote, KeyRound, Loader2, Languages,
  User, Phone, Briefcase, CheckCircle, Edit3, Save, X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import Link from 'next/link';

interface FormData {
  name:            string;
  bio:             string;
  pricePerDay:     number;
  languages:       string;   // comma-separated
  specializations: string;   // comma-separated
  experience:      string;
  phone:           string;
  location:        string;
}

export default function GuideProfilePage() {
  const auth = useContext(AuthContext);
  const u    = auth?.user;

  const [editing,  setEditing]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [resetStep, setResetStep] = useState<'idle'|'sending'|'sent'>('idle');
  const [resetNote, setResetNote] = useState('');

  const buildForm = (): FormData => ({
    name:            u?.name                   ?? '',
    bio:             u?.bio                    ?? '',
    pricePerDay:     u?.pricePerDay            ?? 0,
    languages:       (u?.languages ?? []).map(l => l.name).join(', '),
    specializations: (u?.specializations ?? []).join(', '),
    experience:      u?.experience             ?? '',
    phone:           u?.phone                  ?? '',
    location:        u?.location               ?? '',
  });

  const [form, setForm] = useState<FormData>(buildForm);

  useEffect(() => {
    if (u) setForm(buildForm());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u]);

  const patch = (k: keyof FormData, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/auth/me', {
        name:            form.name.trim(),
        bio:             form.bio.trim(),
        pricePerDay:     Number(form.pricePerDay),
        languages:       form.languages.split(',').map(l => l.trim()).filter(Boolean)
                           .map(l => ({ name: l, code: l.slice(0, 2).toLowerCase() })),
        specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean),
        experience:      form.experience.trim(),
        phone:           form.phone.trim(),
        location:        form.location.trim(),
      });
      await auth?.refreshUser();
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => { setForm(buildForm()); setEditing(false); };

  const handleRequestReset = async () => {
    setResetStep('sending');
    try {
      await api.post('/auth/request-password-reset', { message: resetNote });
      toast.success('Reset request sent to admin!');
      setResetStep('sent');
      setResetNote('');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to send request');
      setResetStep('idle');
    }
  };

  /* ── stat bar ── */
  const stats = [
    { icon: Star,     label: 'Rating',      value: `${(u?.rating ?? 0).toFixed(1)} / 5`              },
    { icon: MapPin,   label: 'Total Trips', value: u?.totalTrips  ?? 0                               },
    { icon: Banknote, label: 'Per Day',     value: `Rs. ${(u?.pricePerDay ?? 0).toLocaleString()}`   },
    { icon: User,     label: 'Reviews',     value: u?.reviewCount ?? 0                               },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-8 max-w-2xl">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Your public guide card seen by travellers</p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)} variant="outline" className="gap-2">
            <Edit3 className="h-4 w-4" />Edit
          </Button>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-lg font-bold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Verification badge ── */}
      {(u as any)?.verified && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Your account is verified by admin. You appear in guide listings.</span>
        </div>
      )}

      {/* ── Profile form ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">

            <Field label="Full Name" icon={User} required>
              <Input value={form.name} onChange={e => patch('name', e.target.value)}
                disabled={!editing} placeholder="Your full name" required />
            </Field>

            <Field label="Bio" icon={Edit3}>
              <Textarea value={form.bio} onChange={e => patch('bio', e.target.value)}
                disabled={!editing} rows={4}
                placeholder="Tell travellers about your guiding style and experience…" />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Price Per Day (Rs.)" icon={Banknote} required>
                <Input type="number" min={0} value={form.pricePerDay || ''}
                  onChange={e => patch('pricePerDay', Number(e.target.value))}
                  disabled={!editing} placeholder="e.g. 3500" required />
              </Field>
              <Field label="Experience" icon={Briefcase}>
                <Input value={form.experience} onChange={e => patch('experience', e.target.value)}
                  disabled={!editing} placeholder="e.g. 5+ years trekking" />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Phone" icon={Phone}>
                <Input value={form.phone} onChange={e => patch('phone', e.target.value)}
                  disabled={!editing} placeholder="10-digit number" maxLength={10} />
              </Field>
              <Field label="Location / Base City" icon={MapPin}>
                <Input value={form.location} onChange={e => patch('location', e.target.value)}
                  disabled={!editing} placeholder="e.g. Pokhara, Nepal" />
              </Field>
            </div>

            <Field label="Languages (comma-separated)" icon={Languages}>
              <Input value={form.languages} onChange={e => patch('languages', e.target.value)}
                disabled={!editing} placeholder="e.g. English, Nepali, Hindi" />
              {!editing && form.languages && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.languages.split(',').map(l => l.trim()).filter(Boolean).map(l => (
                    <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Specializations (comma-separated)" icon={Briefcase}>
              <Input value={form.specializations} onChange={e => patch('specializations', e.target.value)}
                disabled={!editing} placeholder="e.g. Trekking, Cultural Tours, Wildlife" />
              {!editing && form.specializations && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.specializations.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              )}
            </Field>

            {editing && (
              <>
                <Separator />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                    <X className="h-4 w-4 mr-1.5" />Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                      : <><Save className="h-4 w-4 mr-1.5" />Save Changes</>}
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ── Quick links ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/guide/reviews">
          <Card className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Star className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-sm">View Reviews</p>
                <p className="text-xs text-muted-foreground">{u?.reviewCount ?? 0} review{(u?.reviewCount ?? 0) !== 1 ? 's' : ''}</p>

              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/guide/earnings">
          <Card className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Banknote className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Earnings & Payouts</p>
                <p className="text-xs text-muted-foreground">View commission breakdown</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Password reset ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />Password Reset
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resetStep === 'sent' ? (
            <div className="text-center py-4 space-y-2">
              <div className="h-11 w-11 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="font-medium text-emerald-700">Request sent!</p>
              <p className="text-sm text-muted-foreground">An admin will process your reset and notify you.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setResetStep('idle')}>
                Send another
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Can't log in? Submit a reset request to the admin. They'll set a new temporary password.
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
                <Input value={resetNote} onChange={e => setResetNote(e.target.value)}
                  placeholder="e.g. Forgot my password" className="mt-1" />
              </div>
              <Button onClick={handleRequestReset} disabled={resetStep === 'sending'} variant="outline">
                {resetStep === 'sending'
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                  : <><KeyRound className="h-4 w-4 mr-2" />Request Password Reset</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── tiny form-field wrapper ── */
function Field({ label, icon: Icon, required, children }: {
  label: string; icon: React.ElementType; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}{required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
