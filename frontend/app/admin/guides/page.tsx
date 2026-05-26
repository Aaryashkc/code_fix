'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle,
  XCircle,
  Ban,
  Search,
  Star,
  Pencil,
  ShieldOff,
  Eye,
  EyeOff,
  RefreshCw,
  Users,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Clock,
  Mail,
  Filter,
  UserCheck,
  UserXIcon,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface Guide {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  verified: boolean;
  available: boolean;
  suspended: boolean;
  rating: number;
  reviewCount: number;
  totalTrips: number;
  pricePerDay: number;
  bio?: string;
  experience?: string;
  location?: string;
  licenseNumber?: string;
  phone?: string;
  languages: Array<{ name: string; code: string }>;
  specializations: string[];
  certifications: string[];
  offerings: string[];
  createdAt: string;
}

interface GuideEditForm {
  name: string;
  email: string;
  bio: string;
  pricePerDay: number;
  experience: string;
  location: string;
  licenseNumber: string;
  phone: string;
  languages: Guide['languages'];
  specializations: string[];
  available: boolean;
  verified: boolean;
}

interface PasswordResetRequester {
  requesterId?: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterRole?: string;
  message?: string;
}

interface PasswordResetRequest {
  _id: string;
  createdAt: string;
  data?: PasswordResetRequester;
}

interface UserListResponse {
  data?: Guide[];
  pages?: number;
  page?: number;
}

interface PasswordResetResponse {
  data?: PasswordResetRequest[];
}

type GuideFilter = 'all' | 'verified' | 'unverified' | 'suspended';
type GuideAction = 'verify' | 'suspend' | 'revoke' | 'restore';

const GUIDE_FILTERS: readonly GuideFilter[] = ['all', 'verified', 'unverified', 'suspended'];

const EMPTY_EDIT_FORM: GuideEditForm = {
  name: '',
  email: '',
  bio: '',
  pricePerDay: 0,
  experience: '',
  location: '',
  licenseNumber: '',
  phone: '',
  languages: [],
  specializations: [],
  available: false,
  verified: false,
};

const isGuideFilter = (value: string): value is GuideFilter =>
  GUIDE_FILTERS.includes(value as GuideFilter);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
  ) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;
  }
  return fallback;
};

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ne', name: 'Nepali' },
  { code: 'hi', name: 'Hindi' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
];

const SPECIALIZATIONS = [
  'Trekking', 'Cultural Tours', 'Adventure', 'Photography',
  'Wildlife', 'Spiritual', 'Food Tours', 'Mountain Climbing',
];

export default function AdminGuidesPage() {
  const searchParams = useSearchParams();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<GuideFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, GuideAction>>({});

  // Edit modal
  const [editGuide, setEditGuide] = useState<Guide | null>(null);
  const [editForm, setEditForm] = useState<GuideEditForm>(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);

  // Confirm dialogs
  const [revokeTarget, setRevokeTarget] = useState<Guide | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Guide | null>(null);

  // Password reset
  const [passwordResetTarget, setPasswordResetTarget] = useState<Guide | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);

  const fetchGuides = useCallback(
    async ({ showLoader = false, showRefreshing = false }: { showLoader?: boolean; showRefreshing?: boolean } = {}) => {
      if (showLoader) setLoading(true);
      if (showRefreshing) setRefreshing(true);
      try {
        const collectedGuides: Guide[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await api.get<UserListResponse>('/auth/users', {
            params: { role: 'guide', page, limit: 100 },
          });

          const pageData = response.data.data || [];
          const totalPages = response.data.pages ?? 1;
          collectedGuides.push(...pageData);

          page += 1;
          hasMore = page <= totalPages;
        }

        setGuides(collectedGuides);
      } catch (error) {
        console.error('Failed to fetch guides:', error);
        toast.error('Failed to load guides');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const fetchResetRequests = useCallback(async () => {
    try {
      const res = await api.get<PasswordResetResponse>('/auth/password-reset-requests');
      setResetRequests(res.data.data || []);
    } catch {
      // silently fail - admin might not have any requests
    }
  }, []);

  useEffect(() => {
    fetchGuides({ showLoader: true });
    fetchResetRequests();
  }, [fetchGuides, fetchResetRequests]);

  useEffect(() => {
    const filterFromQuery = searchParams.get('filter');
    if (filterFromQuery && isGuideFilter(filterFromQuery)) {
      setFilter(filterFromQuery);
    }
  }, [searchParams]);

  const handlePasswordReset = async () => {
    if (!passwordResetTarget || !newPassword) return;
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setResettingPassword(true);
    try {
      await api.patch(`/auth/users/${passwordResetTarget._id}/reset-password`, {
        newPassword,
      });
      toast.success(`Password reset for ${passwordResetTarget.name}`);
      setPasswordResetTarget(null);
      setNewPassword('');
      setShowPassword(false);
      // Remove any matching reset requests
      setResetRequests((prev) =>
        prev.filter((r) => r.data?.requesterId !== passwordResetTarget._id)
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to reset password'));
    } finally {
      setResettingPassword(false);
    }
  };

  const dismissResetRequest = (requestId: string) => {
    setResetRequests((prev) => prev.filter((r) => r._id !== requestId));
  };

  const openEditModal = (guide: Guide) => {
    setEditGuide(guide);
    setEditForm({
      name: guide.name || '',
      email: guide.email || '',
      bio: guide.bio || '',
      pricePerDay: guide.pricePerDay || 0,
      experience: guide.experience || '',
      location: guide.location || '',
      licenseNumber: guide.licenseNumber || '',
      phone: guide.phone || '',
      languages: guide.languages || [],
      specializations: guide.specializations || [],
      available: guide.available,
      verified: guide.verified,
    });
  };

  const handleEditSave = async () => {
    if (!editGuide) return;
    setSaving(true);
    try {
      await api.put(`/auth/users/${editGuide._id}/admin-update`, editForm);
      toast.success('Guide updated successfully');
      setEditGuide(null);
      fetchGuides({ showRefreshing: true });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update guide'));
    } finally {
      setSaving(false);
    }
  };

  const withLoading = async (guideId: string, action: GuideAction, fn: () => Promise<void>) => {
    setActionLoading(prev => ({ ...prev, [guideId]: action }));
    try {
      await fn();
    } finally {
      setActionLoading(prev => { const next = { ...prev }; delete next[guideId]; return next; });
    }
  };

  const handleVerify = (guideId: string) =>
    withLoading(guideId, 'verify', async () => {
      await api.patch(`/auth/users/${guideId}/verify`, { verified: true });
      toast.success('Guide verified successfully');
      fetchGuides({ showRefreshing: true });
    });

  const handleUnverify = (guideId: string) =>
    withLoading(guideId, 'verify', async () => {
      await api.patch(`/auth/users/${guideId}/verify`, { verified: false });
      toast.success('Guide verification removed');
      fetchGuides({ showRefreshing: true });
    });

  const handleRestore = (guideId: string) =>
    withLoading(guideId, 'restore', async () => {
      await api.patch(`/auth/users/${guideId}/verify`, { verified: true });
      toast.success('Guide restored and verified');
      fetchGuides({ showRefreshing: true });
    });

  const handleSuspend = () => {
    if (!suspendTarget) return;
    withLoading(suspendTarget._id, 'suspend', async () => {
      await api.patch(`/auth/users/${suspendTarget._id}/suspend`);
      toast.success(`${suspendTarget.name} has been suspended`);
      setSuspendTarget(null);
      fetchGuides({ showRefreshing: true });
    }).catch((error: unknown) => toast.error(getErrorMessage(error, 'Failed to suspend guide')));
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    withLoading(revokeTarget._id, 'revoke', async () => {
      await api.patch(`/auth/users/${revokeTarget._id}/revoke`);
      toast.success(`${revokeTarget.name}'s guide access has been revoked`);
      setRevokeTarget(null);
      fetchGuides({ showRefreshing: true });
    }).catch((error: unknown) => toast.error(getErrorMessage(error, 'Failed to revoke guide access')));
  };

  const toggleLanguage = (lang: { code: string; name: string }) => {
    setEditForm((prev) => {
      const exists = prev.languages.some((l) => l.code === lang.code);
      return {
        ...prev,
        languages: exists
          ? prev.languages.filter((l) => l.code !== lang.code)
          : [...prev.languages, lang],
      };
    });
  };

  const toggleSpecialization = (spec: string) => {
    setEditForm((prev) => {
      const exists = prev.specializations.includes(spec);
      return {
        ...prev,
        specializations: exists
          ? prev.specializations.filter((s) => s !== spec)
          : [...prev.specializations, spec],
      };
    });
  };

  const guidesById = useMemo(() => {
    return new Map(guides.map((guide) => [guide._id, guide]));
  }, [guides]);

  const filteredGuides = guides
    .filter((guide) => {
      if (filter === 'verified') return guide.verified && !guide.suspended;
      if (filter === 'unverified') return !guide.verified && !guide.suspended;
      if (filter === 'suspended') return guide.suspended;
      return true;
    })
    .filter((guide) =>
      guide.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guide.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const stats = [
    { 
      label: 'Total Guides', 
      value: guides.length,
      icon: Users,
      color: 'from-violet-500 to-violet-600',
      filter: 'all' as const
    },
    { 
      label: 'Verified', 
      value: guides.filter((g) => g.verified && !g.suspended).length,
      icon: ShieldCheck,
      color: 'from-emerald-500 to-emerald-600',
      filter: 'verified' as const
    },
    { 
      label: 'Unverified', 
      value: guides.filter((g) => !g.verified && !g.suspended).length,
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
      filter: 'unverified' as const
    },
    { 
      label: 'Suspended', 
      value: guides.filter((g) => g.suspended).length,
      icon: Ban,
      color: 'from-red-500 to-red-600',
      filter: 'suspended' as const
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Guides</h1>
        <p className="text-muted-foreground mt-1">
          Edit details, verify, suspend, restore, or revoke guide access with clear safety controls.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.label} 
              className="group cursor-pointer"
              onClick={() => setFilter(stat.filter)}
            >
              <Card className={`relative overflow-hidden border-0 shadow-md transition-all hover:shadow-lg ${filter === stat.filter ? 'ring-2 ring-primary' : ''}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {filter === stat.filter && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Password Reset Requests */}
      {resetRequests.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-5 w-5 text-warning" />
              <h3 className="font-semibold text-foreground">
                Password Reset Requests ({resetRequests.length})
              </h3>
            </div>
            <div className="space-y-2">
              {resetRequests.map((req) => {
                const requesterGuide = req.data?.requesterId
                  ? guidesById.get(req.data.requesterId)
                  : undefined;

                return (
                  <div
                    key={req._id}
                    className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm">{req.data?.requesterName || 'Unknown user'}</span>
                        <span className="text-xs text-muted-foreground">({req.data?.requesterEmail || 'N/A'})</span>
                        <Badge variant="outline" className="text-xs">
                          {req.data?.requesterRole || 'unknown'}
                        </Badge>
                      </div>
                      {req.data?.message && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                          &quot;{req.data.message}&quot;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 ml-6 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(req.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        disabled={!requesterGuide}
                        onClick={() => {
                          if (!requesterGuide) {
                            toast.error('Guide account is not available for reset');
                            return;
                          }

                          setPasswordResetTarget(requesterGuide);
                          setNewPassword('');
                          setShowPassword(false);
                        }}
                      >
                        <KeyRound className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismissResetRequest(req._id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filter}
            onValueChange={(value) => {
              if (isGuideFilter(value)) {
                setFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter guides" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Guides</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchGuides({ showRefreshing: true })}
            disabled={refreshing}
            title="Refresh guide data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filteredGuides.length} of {guides.length} guides
      </p>

      {/* Guides List */}
      {filteredGuides.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No guides found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredGuides.map((guide) => {
            const currentAction = actionLoading[guide._id];
            const isBusy = Boolean(currentAction);

            return (
              <Card key={guide._id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-muted flex-shrink-0">
                      <Image
                        src={guide.avatar?.trim() || '/placeholder.svg'}
                        alt={guide.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-lg">{guide.name}</h3>
                        {guide.suspended ? (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="h-3 w-3" /> Suspended
                          </Badge>
                        ) : guide.verified ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                            <UserCheck className="h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <UserXIcon className="h-3 w-3" /> Unverified
                          </Badge>
                        )}
                        {!guide.available && !guide.suspended && (
                          <Badge variant="outline" className="text-xs">
                            Unavailable
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">{guide.email}</p>

                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span>{guide.rating}/5 ({guide.reviewCount} reviews)</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Trips:</span> {guide.totalTrips}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rate:</span> Rs. {guide.pricePerDay?.toLocaleString()}/day
                        </div>
                        {guide.experience && (
                          <div>
                            <span className="text-muted-foreground">Exp:</span> {guide.experience}
                          </div>
                        )}
                        {guide.location && (
                          <div>
                            <span className="text-muted-foreground">Location:</span> {guide.location}
                          </div>
                        )}
                      </div>

                      {guide.languages.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {guide.languages.map((lang) => (
                            <Badge key={lang.code} variant="outline" className="text-xs">
                              {lang.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {guide.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {guide.specializations.map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Joined {new Date(guide.createdAt).toLocaleDateString()}
                        {guide.licenseNumber && <> · License: {guide.licenseNumber}</>}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(guide)}
                        disabled={isBusy}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>

                      {guide.suspended ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleRestore(guide._id)}
                          disabled={isBusy}
                        >
                          {currentAction === 'restore' ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Restore
                        </Button>
                      ) : !guide.verified ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleVerify(guide._id)}
                          disabled={isBusy}
                        >
                          {currentAction === 'verify' ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Verify
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUnverify(guide._id)}
                          disabled={isBusy}
                        >
                          {currentAction === 'verify' ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          Unverify
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPasswordResetTarget(guide);
                          setNewPassword('');
                          setShowPassword(false);
                        }}
                        disabled={isBusy}
                      >
                        <KeyRound className="h-4 w-4 mr-1" />
                        Password
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-200 text-amber-600 hover:bg-amber-50 disabled:border-amber-100 disabled:text-amber-300"
                        onClick={() => setSuspendTarget(guide)}
                        disabled={isBusy || guide.suspended}
                      >
                        {currentAction === 'suspend' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4 mr-1" />
                        )}
                        {guide.suspended ? 'Suspended' : 'Suspend'}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRevokeTarget(guide)}
                        disabled={isBusy}
                      >
                        {currentAction === 'revoke' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <ShieldOff className="h-4 w-4 mr-1" />
                        )}
                        Revoke
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========== EDIT GUIDE DIALOG ========== */}
      <Dialog
        open={!!editGuide}
        onOpenChange={(open) => {
          if (!open) {
            setEditGuide(null);
            setEditForm(EMPTY_EDIT_FORM);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guide — {editGuide?.name}</DialogTitle>
            <DialogDescription>
              Update guide details. Changes are saved immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editForm.location}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <Separator />

            {/* Professional Details */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price Per Day (Rs.)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editForm.pricePerDay}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, pricePerDay: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-experience">Experience</Label>
                <Input
                  id="edit-experience"
                  placeholder="e.g. 5 years"
                  value={editForm.experience}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, experience: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-license">License Number</Label>
                <Input
                  id="edit-license"
                  value={editForm.licenseNumber}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, licenseNumber: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            {/* Languages */}
            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const isSelected = editForm.languages.some((l) => l.code === lang.code);
                  return (
                    <Badge
                      key={lang.code}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleLanguage(lang)}
                    >
                      {lang.name} {isSelected && '✓'}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Specializations */}
            <div className="space-y-2">
              <Label>Specializations</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((spec) => {
                  const isSelected = editForm.specializations?.includes(spec);
                  return (
                    <Badge
                      key={spec}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleSpecialization(spec)}
                    >
                      {spec} {isSelected && '✓'}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Status Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.verified}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, verified: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">Verified</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.available}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, available: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">Available</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditGuide(null);
                setEditForm(EMPTY_EDIT_FORM);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== SUSPEND CONFIRM ========== */}
      <AlertDialog open={!!suspendTarget} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {suspendTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the guide as unavailable and remove their verification.
              They won&apos;t appear in search results or receive new bookings.
              You can re-verify them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={suspendTarget ? actionLoading[suspendTarget._id] === 'suspend' : false}
            >
              {suspendTarget && actionLoading[suspendTarget._id] === 'suspend' ? 'Suspending...' : 'Suspend Guide'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========== REVOKE ACCESS CONFIRM ========== */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Revoke Guide Access — {revokeTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This is a severe action. The guide will be <strong>demoted to a tourist account</strong>.
              They will lose all guide privileges, active bookings may be affected, and they
              won&apos;t be able to operate as a guide anymore. This cannot be undone easily.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={revokeTarget ? actionLoading[revokeTarget._id] === 'revoke' : false}
            >
              {revokeTarget && actionLoading[revokeTarget._id] === 'revoke' ? 'Revoking...' : 'Revoke Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========== RESET PASSWORD DIALOG ========== */}
      <Dialog
        open={!!passwordResetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordResetTarget(null);
            setNewPassword('');
            setShowPassword(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{passwordResetTarget?.name}</strong> ({passwordResetTarget?.email}).
              The guide will be notified that their password was changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="text-xs text-destructive">Password must be at least 8 characters</p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
                let pass = '';
                for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)];
                setNewPassword(pass);
                setShowPassword(true);
              }}
            >
              Generate Random Password
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordResetTarget(null);
                setNewPassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={resettingPassword || newPassword.length < 8}
            >
              {resettingPassword ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
