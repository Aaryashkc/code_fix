'use client';

import { useEffect, useState, memo } from 'react';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Users, Star, CreditCard, Loader2, Banknote, LocateFixed, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatNPR } from '@/lib/currency';
import { savePaymentReturnPath } from '@/lib/paymentRedirect';

interface Booking {
  _id: string;
  guide: {
    _id: string;
    name: string;
    avatar?: string;
    rating: number;
  };
  destinations: Array<{
    _id: string;
    name: string;
    images: string[];
  }>;
  customDestinations?: Array<{
    name: string;
    location?: {
      coordinates?: [number, number];
      address?: string;
    };
  }>;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  packageType: string;
  groupSize: number;
  totalPrice: number;
  offeredPrice?: number;
  counterPrice?: number;
  agreedPrice?: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentTransactionId?: string;
  completionRequestedBy?: 'tourist' | 'guide';
  completionRequestedAt?: string;
  touristCompletedAt?: string;
  guideCompletedAt?: string;
  specialRequirements?: string;
  expiresAt?: string;
  negotiationHistory?: Array<{
    price: number;
    by: string;
    message?: string;
    at: string;
  }>;
  createdAt: string;
  review?: {
    rating: number;
    comment?: string;
    createdAt: string;
  };
}

interface DestinationOption {
  _id: string;
  name: string;
  category?: string;
  region?: string;
}

interface BookingCardProps {
  booking: Booking;
  payingBookingId: string | null;
  onPayment: (bookingId: string) => void;
  onCashPayment: (bookingId: string) => void;
  onComplete: (booking: Booking) => void;
  onFetchBookings: () => void;
  onSelectBooking: (booking: Booking) => void;
  onOpenCancelDialog: () => void;
  onOpenReviewDialog: () => void;
  onOpenItineraryDialog: () => void;
}

type BookingStatusBadgeConfig = {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
  className?: string;
};

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    return (error as ApiErrorLike).response?.data?.message || fallback;
  }

  return fallback;
}

export const getPaymentBadge = (booking: Booking) => {
  if (booking.paymentStatus === 'paid') {
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50">✓ Paid</Badge>;
  }
  if (booking.paymentStatus === 'refunded') {
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50">Refunded</Badge>;
  }
  if (booking.status === 'confirmed' && booking.paymentMethod === 'cash') {
    return <Badge className="bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/50">Cash – Awaiting Confirmation</Badge>;
  }
  if (booking.status === 'confirmed') {
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50">Payment Pending</Badge>;
  }
  return null;
};

export const getStatusBadge = (status: string) => {
  const variants: Record<string, BookingStatusBadgeConfig> = {
    pending: { variant: 'secondary', label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50' },
    negotiating: { variant: 'secondary', label: '🔄 Negotiating', className: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/50' },
    confirmed: { variant: 'default', label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50' },
    completed: { variant: 'outline', label: 'Completed', className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
    declined: { variant: 'destructive', label: 'Declined' },
    expired: { variant: 'secondary', label: 'Expired', className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50' },
  };
  const config = variants[status] || variants.pending;
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

const BookingCard = memo(function BookingCard({
  booking,
  payingBookingId,
  onPayment,
  onCashPayment,
  onComplete,
  onFetchBookings,
  onSelectBooking,
  onOpenCancelDialog,
  onOpenReviewDialog,
  onOpenItineraryDialog,
}: BookingCardProps) {
  const touristConfirmedCompletion = Boolean(booking.touristCompletedAt);
  const guideConfirmedCompletion = Boolean(booking.guideCompletedAt);
  const canActOnCompletion = booking.status === 'confirmed' && booking.paymentStatus === 'paid' && !touristConfirmedCompletion;
  const waitingForGuideCompletion = booking.status === 'confirmed' && touristConfirmedCompletion && !guideConfirmedCompletion;

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full">
              <Image
                src={booking.guide.avatar || '/placeholder.svg'}
                alt={booking.guide.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <CardTitle className="text-lg">{booking.guide.name}</CardTitle>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 fill-secondary text-secondary" />
                <span className="text-sm text-muted-foreground">{booking.guide.rating}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(booking.status)}
            {getPaymentBadge(booking)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dates */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
          </span>
          <Badge variant="outline">{booking.numberOfDays} days</Badge>
        </div>

        {/* Package & Group */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{booking.packageType}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{booking.groupSize} people</span>
          </div>
        </div>

        {/* Destinations */}
        {((booking.destinations && booking.destinations.length > 0) || (booking.customDestinations && booking.customDestinations.length > 0)) && (
          <div>
            <p className="text-sm font-medium mb-2">Destinations:</p>
            <div className="flex flex-wrap gap-2">
              {booking.destinations.map((dest) => (
                <Badge key={dest._id} variant="secondary">
                  {dest.name}
                </Badge>
              ))}
              {booking.customDestinations?.map((dest) => (
                <Badge key={dest.name} variant="outline">
                  {dest.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Special Requirements */}
        {booking.specialRequirements && (
          <div>
            <p className="text-sm font-medium mb-1">Special Requirements:</p>
            <p className="text-sm text-muted-foreground">{booking.specialRequirements}</p>
          </div>
        )}

        {booking.status === 'confirmed' && booking.paymentStatus === 'paid' && (booking.completionRequestedBy || touristConfirmedCompletion || guideConfirmedCompletion) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            {guideConfirmedCompletion && !touristConfirmedCompletion
              ? 'Guide has requested completion. Confirm it to finalize the booking and unlock review.'
              : touristConfirmedCompletion && !guideConfirmedCompletion
                ? 'You requested completion. Waiting for the guide to confirm before the trip is completed.'
                : 'Completion is being confirmed by both parties.'}
          </div>
        )}

        {/* Negotiation Info */}
        {booking.status === 'negotiating' && booking.negotiationHistory && booking.negotiationHistory.length > 0 && (
          <div className="bg-violet-50 border border-violet-200 dark:bg-violet-950/20 dark:border-violet-800/40 rounded-xl p-3 space-y-1">
            <p className="text-sm font-medium text-violet-800 dark:text-violet-300">Price Negotiation</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your offer:</span>
              <span className="font-medium">{formatNPR(booking.offeredPrice || 0)}</span>
            </div>
            {booking.counterPrice && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Guide&apos;s counter:</span>
                <span className="font-medium text-violet-700 dark:text-violet-300">{formatNPR(booking.counterPrice)}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold">{formatNPR(booking.agreedPrice || booking.totalPrice)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {booking.agreedPrice ? 'Agreed price' : booking.status === 'negotiating' ? 'Current offer' : 'Total amount'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            {booking.status === 'confirmed' && booking.paymentStatus !== 'paid' && booking.paymentMethod !== 'cash' && (
              <>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => onPayment(booking._id)}
                  disabled={payingBookingId === booking._id}
                >
                  {payingBookingId === booking._id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Pay with eSewa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCashPayment(booking._id)}
                  disabled={payingBookingId === booking._id}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Pay by Cash
                </Button>
              </>
            )}
            {booking.status === 'negotiating' && booking.counterPrice && (
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await api.put(`/bookings/${booking._id}/accept-price`);
                    toast.success('Price accepted! Booking confirmed.');
                    onFetchBookings();
                  } catch (error: unknown) {
                    toast.error(getApiErrorMessage(error, 'Failed to accept price'));
                  }
                }}
              >
                Accept {formatNPR(booking.counterPrice)}
              </Button>
            )}
            {['pending', 'negotiating'].includes(booking.status) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onSelectBooking(booking);
                  onOpenCancelDialog();
                }}
              >
                Cancel
              </Button>
            )}
            {booking.status === 'confirmed' && new Date(booking.startDate) > new Date() && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onSelectBooking(booking);
                  onOpenCancelDialog();
                }}
              >
                Cancel Booking
              </Button>
            )}
            {booking.status === 'completed' && !booking.review?.rating && (
              <Button
                size="sm"
                onClick={() => {
                  onSelectBooking(booking);
                  onOpenReviewDialog();
                }}
              >
                <Star className="h-4 w-4 mr-2" />
                Leave Review
              </Button>
            )}
            {canActOnCompletion && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onComplete(booking)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {guideConfirmedCompletion ? 'Confirm Completion' : 'Request Completion'}
              </Button>
            )}
            {waitingForGuideCompletion && (
              <Button size="sm" variant="outline" disabled>
                Waiting for Guide
              </Button>
            )}
            {booking.status === 'confirmed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onSelectBooking(booking);
                  onOpenItineraryDialog();
                }}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Edit Stops
              </Button>
            )}
            {booking.status === 'confirmed' && (
              <Link href={`/user/active-trip?bookingId=${booking._id}`}>
                <Button size="sm" variant="outline">
                  <LocateFixed className="mr-2 h-4 w-4" />
                  Start Live Trip
                </Button>
              </Link>
            )}
            <Link href={`/guides/${booking.guide._id}`}>
              <Button variant="outline" size="sm">
                View Guide
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<DestinationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [itineraryDialogOpen, setItineraryDialogOpen] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDestinationIds, setSelectedDestinationIds] = useState<string[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
    fetchDestinations();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings/my-bookings');
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchDestinations = async () => {
    try {
      const response = await api.get('/destinations?limit=50&sort=name');
      setDestinationOptions(response.data.data || []);
    } catch {
      setDestinationOptions([]);
    }
  };

  const openItineraryDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedDestinationIds((booking.destinations || []).map((destination) => destination._id));
    setItineraryDialogOpen(true);
  };

  const toggleDestination = (destinationId: string) => {
    setSelectedDestinationIds((current) =>
      current.includes(destinationId)
        ? current.filter((id) => id !== destinationId)
        : [...current, destinationId]
    );
  };

  const handleUpdateItinerary = async () => {
    if (!selectedBooking) return;
    if (selectedDestinationIds.length === 0) {
      toast.error('Select at least one destination');
      return;
    }

    try {
      await api.patch(`/bookings/${selectedBooking._id}/destinations`, {
        destinations: selectedDestinationIds,
      });
      toast.success('Trip stops updated');
      setItineraryDialogOpen(false);
      setSelectedBooking(null);
      setSelectedDestinationIds([]);
      fetchBookings();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to update trip stops'));
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancelReason) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    try {
      const response = await api.put(`/bookings/${selectedBooking._id}/cancel`, {
        cancellationReason: cancelReason,
      });
      toast.success(response?.data?.message || 'Booking cancelled successfully');
      setCancelDialogOpen(false);
      setCancelReason('');
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to cancel booking'));
    }
  };


  const handleSubmitReview = async () => {
    if (!selectedBooking) return;

    try {
      await api.post('/reviews', {
        bookingId: selectedBooking._id,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success('Review submitted successfully');
      setReviewDialogOpen(false);
      setReviewRating(5);
      setReviewComment('');
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to submit review'));
    }
  };

  const handlePayment = async (bookingId: string) => {
    setPayingBookingId(bookingId);
    try {
      savePaymentReturnPath();
      const response = await api.post('/payments/initiate', { bookingId });
      const { payment_url, formData } = response.data.data;

      if (!payment_url || !formData) {
        toast.error('Invalid payment response. Please try again.');
        setPayingBookingId(null);
        return;
      }

      // Build form with DocumentFragment for faster DOM manipulation
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payment_url;
      form.style.display = 'none';

      const fragment = document.createDocumentFragment();
      const entries = Object.entries(formData);
      for (let i = 0; i < entries.length; i++) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = entries[i][0];
        input.value = String(entries[i][1]);
        fragment.appendChild(input);
      }
      form.appendChild(fragment);
      document.body.appendChild(form);

      // Submit immediately — no delay
      form.submit();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to initiate payment'));
      setPayingBookingId(null);
    }
  };

  const handleCashPayment = async (bookingId: string) => {
    setPayingBookingId(bookingId);
    try {
      await api.post('/payments/cash', { bookingId });
      toast.success('Cash payment selected! Please pay the guide directly.');
      fetchBookings();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to select cash payment'));
    } finally {
      setPayingBookingId(null);
    }
  };

  const handleCompleteBooking = async (booking: Booking) => {
    try {
      const response = await api.put(`/bookings/${booking._id}/complete`);
      toast.success(response.data?.message ?? 'Completion confirmation saved!');
      fetchBookings();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to confirm trip completion'));
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => ['pending', 'negotiating', 'confirmed'].includes(b.status)
  );
  const pastBookings = bookings.filter(
    (b) => b.status === 'completed'
  );
  const cancelledBookings = bookings.filter((b) => ['cancelled', 'declined', 'expired'].includes(b.status));

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-24" />)}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-6">
              <div className="flex gap-4">
                <Skeleton className="h-24 w-24 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* ── Page header ── */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Your trips</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Track confirmations, payments, negotiations, and completed trips.
          </p>
        </div>

        {/* Stat chips */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Upcoming',  value: upcomingBookings.length,  color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30',  ring: 'ring-emerald-200 dark:ring-emerald-800/50' },
            { label: 'Completed', value: pastBookings.length,      color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/30',          ring: 'ring-blue-200 dark:ring-blue-800/50' },
            { label: 'Closed',    value: cancelledBookings.length, color: 'text-slate-600 dark:text-slate-400',     bg: 'bg-muted/60',                              ring: 'ring-border' },
          ].map((c) => (
            <div key={c.label} className={`flex flex-col rounded-xl p-3.5 ring-1 ${c.bg} ${c.ring}`}>
              <span className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</span>
              <span className="mt-0.5 text-xs font-medium text-muted-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList className="h-auto p-1">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingBookings.length === 0 ? (
            <Card className="border border-dashed border-border/60 shadow-none">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">No upcoming bookings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse places and find a guide to start your adventure!
                </p>
                <Link href="/user/places">
                  <Button className="mt-4">Explore Places</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  payingBookingId={payingBookingId}
                  onPayment={handlePayment}
                  onCashPayment={handleCashPayment}
                  onComplete={handleCompleteBooking}
                  onFetchBookings={fetchBookings}
                  onSelectBooking={setSelectedBooking}
                  onOpenCancelDialog={() => setCancelDialogOpen(true)}
                  onOpenReviewDialog={() => setReviewDialogOpen(true)}
                  onOpenItineraryDialog={() => openItineraryDialog(booking)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastBookings.length === 0 ? (
            <Card className="border border-dashed border-border/60 shadow-none">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No past bookings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  payingBookingId={payingBookingId}
                  onPayment={handlePayment}
                  onCashPayment={handleCashPayment}
                  onComplete={handleCompleteBooking}
                  onFetchBookings={fetchBookings}
                  onSelectBooking={setSelectedBooking}
                  onOpenCancelDialog={() => setCancelDialogOpen(true)}
                  onOpenReviewDialog={() => setReviewDialogOpen(true)}
                  onOpenItineraryDialog={() => openItineraryDialog(booking)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          {cancelledBookings.length === 0 ? (
            <Card className="border border-dashed border-border/60 shadow-none">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No cancelled bookings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {cancelledBookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  payingBookingId={payingBookingId}
                  onPayment={handlePayment}
                  onCashPayment={handleCashPayment}
                  onComplete={handleCompleteBooking}
                  onFetchBookings={fetchBookings}
                  onSelectBooking={setSelectedBooking}
                  onOpenCancelDialog={() => setCancelDialogOpen(true)}
                  onOpenReviewDialog={() => setReviewDialogOpen(true)}
                  onOpenItineraryDialog={() => openItineraryDialog(booking)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancellation. This helps us improve our service.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking}>
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Itinerary Dialog */}
      <Dialog open={itineraryDialogOpen} onOpenChange={setItineraryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Trip Stops</DialogTitle>
            <DialogDescription>
              Choose the places you want your guide to include in this confirmed booking.
            </DialogDescription>
          </DialogHeader>
          {destinationOptions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Destinations could not be loaded right now.
            </div>
          ) : (
            <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto rounded-xl border p-2 sm:grid-cols-2">
              {destinationOptions.map((destination) => {
                const selected = selectedDestinationIds.includes(destination._id);
                return (
                  <button
                    key={destination._id}
                    type="button"
                    onClick={() => toggleDestination(destination._id)}
                    className={`flex min-h-14 items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40'
                    }`}
                  >
                    <CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'opacity-100' : 'opacity-25'}`} />
                    <span className="min-w-0">
                      <span className="block font-medium leading-tight">{destination.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[destination.category, destination.region].filter(Boolean).join(' - ') || 'Destination'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setItineraryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItinerary}>
              Save Stops
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              Share your experience with {selectedBooking?.guide.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= reviewRating
                          ? 'fill-secondary text-secondary'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Comment</label>
              <Textarea
                placeholder="Share your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
