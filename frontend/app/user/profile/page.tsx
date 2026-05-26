'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AuthContext, type User as AuthUser } from '@/context/AuthContext';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Bell,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock3,
  Globe2,
  Heart,
  Languages,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

type EmergencyContact = {
  name: string;
  phone: string;
};

type TravelerPreferences = {
  budget: string;
  fitness: string;
  travelStyle: string;
  duration: string;
};

type ProfileUser = AuthUser & {
  phone?: string;
  country?: string;
  emergencyContact?: EmergencyContact;
  preferences?: Partial<TravelerPreferences>;
  verified?: boolean;
  emailVerified?: boolean;
};

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  country: string;
  emergencyContact: EmergencyContact;
  preferences: TravelerPreferences;
};

const defaultPreferences: TravelerPreferences = {
  budget: 'Mid-range',
  fitness: 'Medium',
  travelStyle: 'Solo',
  duration: '1 week',
};

const preferenceOptions = {
  budget: ['Budget', 'Mid-range', 'Luxury'],
  fitness: ['Low', 'Medium', 'High'],
  travelStyle: ['Solo', 'Couple', 'Family', 'Group'],
  duration: ['Weekend', '1 week', '2 weeks', '1 month'],
};

function getProfileUser(user: AuthUser | null | undefined): ProfileUser | null {
  return user ? (user as ProfileUser) : null;
}

function buildFormData(user: ProfileUser | null): ProfileForm {
  return {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    country: user?.country || '',
    emergencyContact: user?.emergencyContact || { name: '', phone: '' },
    preferences: {
      ...defaultPreferences,
      ...(user?.preferences || {}),
    },
  };
}

function getInitials(name?: string) {
  const parts = (name || 'Traveler')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'TR';
}

export default function UserProfilePage() {
  const auth = useContext(AuthContext);
  const profileUser = getProfileUser(auth?.user);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [tripAlerts, setTripAlerts] = useState(true);
  const [formData, setFormData] = useState<ProfileForm>(() => buildFormData(profileUser));

  useEffect(() => {
    if (!auth?.isLoading) {
      setFormData(buildFormData(profileUser));
      setIsLoading(false);
    }
  }, [auth?.isLoading, profileUser]);

  const profileCompleteness = useMemo(() => {
    const fields = [
      formData.name,
      formData.email,
      formData.phone,
      formData.country,
      formData.emergencyContact.name,
      formData.emergencyContact.phone,
      formData.preferences.budget,
      formData.preferences.fitness,
      formData.preferences.travelStyle,
      formData.preferences.duration,
    ];

    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [formData]);

  const memberSince = profileUser?.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'Recently joined';

  const verified = Boolean(profileUser?.verified || profileUser?.emailVerified);

  const stats = [
    {
      label: 'Places visited',
      value: profileUser?.stats?.placesVisited || 0,
      icon: MapPin,
      tone: 'text-blue-700 bg-blue-50 border-blue-100',
    },
    {
      label: 'Saved places',
      value: profileUser?.stats?.pinsCreated || 0,
      icon: Heart,
      tone: 'text-rose-700 bg-rose-50 border-rose-100',
    },
    {
      label: 'Upcoming trips',
      value: profileUser?.stats?.upcomingTrips || 0,
      icon: CalendarCheck,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await api.put('/auth/me', formData);
      await auth?.refreshUser();
      toast.success('Profile updated');
      setEditing(false);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to update profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setFormData(buildFormData(profileUser));
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl space-y-4 pb-8">
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b bg-muted/35 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-background">
                  {profileUser?.avatar ? (
                    <Image src={profileUser.avatar} alt={formData.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary text-xl font-bold text-primary-foreground">
                      {getInitials(formData.name)}
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-md bg-background/95 text-foreground shadow-sm"
                    aria-label="Update profile photo"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold tracking-tight">{formData.name || 'Traveler Profile'}</h1>
                    <Badge variant={verified ? 'default' : 'secondary'} className="gap-1">
                      {verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                      {verified ? 'Verified' : 'Verification pending'}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {formData.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Globe2 className="h-3.5 w-3.5" />
                      {formData.country || 'Country not set'}
                    </span>
                    <span>Member since {memberSince}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {editing ? (
                  <>
                    <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving} className="gap-2">
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save changes'}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setEditing(true)}>
                    Edit profile
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Profile strength</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-bold">{profileCompleteness}%</span>
                <Badge variant={profileCompleteness >= 80 ? 'default' : 'secondary'}>
                  {profileCompleteness >= 80 ? 'Strong' : 'Needs details'}
                </Badge>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${profileCompleteness}%` }} />
              </div>
            </div>

            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{stat.label}</p>
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-md border', stat.tone)}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold">{stat.value}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Identity and Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Legal name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  disabled={!editing}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" value={formData.email} disabled />
                <p className="text-xs text-muted-foreground">Email changes are handled by account verification.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  disabled={!editing}
                  placeholder="+977 98XXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country or region</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(event) => setFormData((current) => ({ ...current, country: event.target.value }))}
                  disabled={!editing}
                  placeholder="Nepal"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Contact name</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyContact.name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      emergencyContact: { ...current.emergencyContact, name: event.target.value },
                    }))
                  }
                  disabled={!editing}
                  placeholder="Full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Contact phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={formData.emergencyContact.phone}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      emergencyContact: { ...current.emergencyContact, phone: event.target.value },
                    }))
                  }
                  disabled={!editing}
                  placeholder="+977 98XXXXXXXX"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Languages className="h-5 w-5 text-primary" />
                Travel Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(preferenceOptions).map(([key, options]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="capitalize">
                    {key === 'travelStyle' ? 'Travel style' : key}
                  </Label>
                  <select
                    id={key}
                    value={formData.preferences[key as keyof TravelerPreferences]}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        preferences: {
                          ...current.preferences,
                          [key]: event.target.value,
                        },
                      }))
                    }
                    disabled={!editing}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Trust and Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">Account status</span>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your account can book guides, save places, and manage trip plans.
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Sign-in protection</span>
                  </div>
                  <Badge variant="secondary">Standard</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Password and session security are managed through Yatra authentication.
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Email notifications</p>
                    <p className="text-xs text-muted-foreground">Booking updates and trip reminders.</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Trip safety alerts</p>
                    <p className="text-xs text-muted-foreground">Weather, route, and live-trip notices.</p>
                  </div>
                  <Switch checked={tripAlerts} onCheckedChange={setTripAlerts} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Profile Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Name and email', done: Boolean(formData.name && formData.email), icon: User },
                { label: 'Phone and country', done: Boolean(formData.phone && formData.country), icon: Phone },
                {
                  label: 'Emergency contact',
                  done: Boolean(formData.emergencyContact.name && formData.emergencyContact.phone),
                  icon: ShieldCheck,
                },
                { label: 'Travel preferences', done: profileCompleteness >= 80, icon: Bell },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-md border p-2.5">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md',
                        item.done ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
