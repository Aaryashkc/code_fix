'use client';

import { useEffect, useState, useContext } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { AuthContext } from '@/context/AuthContext';
import { NotificationContext } from '@/context/NotificationContext';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star, MapPin, Languages, Calendar, Banknote, CheckCircle,
  Award, Users, ArrowLeft, MessageCircle, Shield, Loader2, Send, ArrowRight, X,
  Route, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import LiveRequestCard from '@/components/booking/live-request-card';
import NegotiationPanel from '@/components/booking/negotiation-panel';
import { ProfileSkeleton } from '@/components/ui/skeleton-cards';

interface Guide {
  _id: string;
  name: string;
  avatar?: string;
  bio?: string;
  rating: number;
  reviewCount: number;
  languages: Array<{ code: string; name: string }>;
  specializations: string[];
  pricePerDay: number;
  experience?: string;
  available: boolean;
  verified: boolean;
  location?: string;
  totalTrips?: number;
  responseTime?: string;
}

interface Review {
  _id: string;
  reviewer: { _id: string; name: string; avatar?: string };
  rating: number;
  comment: string;
  createdAt: string;
}

interface BookingHistoryItem {
  id: string;
  route: string;
  destinations: { name: string; category: string }[];
  date: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  rating: number | null;
  customerFrom: string;
}

interface ActiveBooking {
  _id: string;
  status: string;
  offeredPrice: number;
  counterPrice?: number;
  agreedPrice?: number;
  totalPrice: number;
  numberOfDays: number;
  expiresAt?: string;
  negotiationHistory: Array<{
    price: number;
    by: 'tourist' | 'guide';
    message?: string;
    at: string;
  }>;
  guide: { _id: string; name: string; pricePerDay: number };
}

export default function GuideProfilePage() {
  const params = useParams();
  const auth = useContext(AuthContext);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookingHistory, setBookingHistory] = useState<BookingHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'details' | 'price' | 'waiting'>(
    'details'
  );
  const [submitting, setSubmitting] = useState(false);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);

  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    groupSize: 1,
    packageType: 'Full Day Adventure',
    specialRequirements: '',
    message: '',
  });

  const [offeredPrice, setOfferedPrice] = useState(0);

  useEffect(() => {
    if (params.id) {
      fetchGuideDetails();
      fetchBookingHistory(1);
    }
  }, [params.id]);

  const fetchBookingHistory = async (page: number) => {
    try {
      setHistoryLoading(true);
      const res = await api.get(`/guides/${params.id}/booking-history?page=${page}&limit=5`);
      if (page === 1) {
        setBookingHistory(res.data.data || []);
      } else {
        setBookingHistory(prev => [...prev, ...(res.data.data || [])]);
      }
      setHistoryTotal(res.data.total || 0);
      setHistoryPage(page);
    } catch {
      // Non-critical — fail silently
    } finally {
      setHistoryLoading(false);
    }
  };

  // Initialize offered price when guide loads or dates change
  useEffect(() => {
    if (guide && bookingData.startDate && bookingData.endDate) {
      const start = new Date(bookingData.startDate);
      const end = new Date(bookingData.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setOfferedPrice(days * guide.pricePerDay);
    }
  }, [guide, bookingData.startDate, bookingData.endDate]);

  // Poll active booking for real-time updates
  useEffect(() => {
    if (!activeBooking || !['pending', 'negotiating'].includes(activeBooking.status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/bookings/${activeBooking._id}`);
        setActiveBooking(res.data.data);
      } catch {
        // ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeBooking?._id, activeBooking?.status]);

  const fetchGuideDetails = async () => {
    try {
      const guideRes = await api.get(`/guides/${params.id}`);
      setGuide(guideRes.data.data);

      try {
        const reviewsRes = await api.get(`/reviews/guide/${params.id}`);
        setReviews(reviewsRes.data.data || []);
      } catch {
        setReviews([]);
      }
    } catch (error) {
      console.error('Failed to fetch guide details:', error);
      toast.error('Failed to load guide profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!bookingData.startDate || !bookingData.endDate) return 0;
    const start = new Date(bookingData.startDate);
    const end = new Date(bookingData.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const guideTotal = () => {
    if (!guide) return 0;
    return calculateDays() * guide.pricePerDay;
  };

  const handleSendRequest = async () => {
    if (!bookingData.startDate || !bookingData.endDate) {
      toast.error('Please select dates');
      return;
    }
    if (offeredPrice <= 0) {
      toast.error('Please set a valid offer price');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/bookings', {
        guideId: params.id,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        numberOfDays: calculateDays(),
        packageType: bookingData.packageType,
        groupSize: bookingData.groupSize,
        specialRequirements: bookingData.specialRequirements,
        offeredPrice,
        message: bookingData.message,
      });

      setActiveBooking(res.data.data);
      setBookingStep('waiting');
      toast.success('Booking request sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    try {
      await api.put(`/bookings/${activeBooking._id}/cancel`);
      setActiveBooking(null);
      setBookingStep('details');
      setBookingDialogOpen(false);
      toast.success('Booking cancelled');
    } catch {
      toast.error('Failed to cancel booking');
    }
  };

  const handleAcceptPrice = async (price?: number) => {
    if (!activeBooking) return;
    try {
      const res = await api.put(`/bookings/${activeBooking._id}/accept-price`);
      setActiveBooking(res.data.data);
      const displayPrice = price || 0;
      toast.success(`Booking confirmed at Rs. ${displayPrice.toLocaleString()}!`);
    } catch {
      toast.error('Failed to accept price');
    }
  };

  const handleReviseOffer = async (newPrice: number, message: string) => {
    if (!activeBooking) return;
    try {
      const res = await api.put(`/bookings/${activeBooking._id}/revise-offer`, {
        price: newPrice,
        message,
      });
      setActiveBooking(res.data.data);
      toast.success('Revised offer sent');
    } catch {
      toast.error('Failed to revise offer');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!guide) {
    return <div className="container mx-auto p-8">Guide not found</div>;
  }

  // Calculate real rating breakdown from actual reviews
  const calculateRatingBreakdown = () => {
    if (!reviews.length) return [];
    
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const rating = Math.round(review.rating);
      if (rating >= 1 && rating <= 5) {
        counts[rating as keyof typeof counts]++;
      }
    });
    
    return [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: counts[stars as keyof typeof counts],
      percentage: reviews.length > 0 ? Math.round((counts[stars as keyof typeof counts] / reviews.length) * 100) : 0,
    }));
  };

  const ratingBreakdown = calculateRatingBreakdown();

  const days = calculateDays();
  const priceDiff = offeredPrice > 0 && guideTotal() > 0
    ? Math.round(((offeredPrice - guideTotal()) / guideTotal()) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Link href="/user/guides">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Guides
          </Button>
        </Link>
      </div>

      {/* Profile Header */}
      <div className="mx-4 md:mx-6 lg:mx-8 rounded-3xl overflow-hidden bg-gradient-to-br from-[hsl(228_72%_10%)] via-[hsl(228_65%_16%)] to-[hsl(228_58%_22%)] shadow-xl border border-[hsl(228_55%_25%)/40]">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Profile Image */}
            <div className="relative">
              <div className="relative h-48 w-48 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <Image
                  src={guide.avatar || '/placeholder.svg'}
                  alt={guide.name}
                  fill
                  className="object-cover"
                />
                {guide.available && (
                  <div className="absolute bottom-4 right-4 h-6 w-6 bg-emerald-500 rounded-full border-4 border-white"></div>
                )}
              </div>
              {guide.verified && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm shadow-md">
                  <CheckCircle className="h-4 w-4" />
                  <span>Verified</span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-sm">{guide.name}</h1>
                  {guide.location && (
                    <div className="flex items-center gap-2 text-white/80 mb-4">
                      <MapPin className="h-5 w-5" />
                      <span>{guide.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={guide.available ? 'default' : 'secondary'}
                    className={`text-lg py-2 px-4 ${guide.available ? 'bg-green-500 hover:bg-green-600' : ''}`}
                  >
                    {guide.available ? (
                      <>
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                        Available Now
                      </>
                    ) : (
                      'Currently Busy'
                    )}
                  </Badge>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/12 border border-white/20 rounded-xl p-4 text-center text-white">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-5 w-5 fill-secondary text-secondary" />
                    <span className="text-2xl font-bold">{guide.rating > 0 ? guide.rating : 'New'}</span>
                  </div>
                  <p className="text-xs text-white/80">
                    {guide.reviewCount > 0 ? `${guide.reviewCount} reviews` : 'No reviews yet'}
                  </p>
                </div>
                {guide.totalTrips ? (
                  <div className="bg-white/12 border border-white/20 rounded-xl p-4 text-center text-white">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="h-5 w-5 text-emerald-300" />
                      <span className="text-2xl font-bold">{guide.totalTrips}</span>
                    </div>
                    <p className="text-xs text-white/80">Trips completed</p>
                  </div>
                ) : (
                  <div className="bg-white/12 border border-white/20 rounded-xl p-4 text-center text-white">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Award className="h-5 w-5 text-emerald-300" />
                      <span className="text-2xl font-bold">Verified</span>
                    </div>
                    <p className="text-xs text-white/80">Professional Guide</p>
                  </div>
                )}
                <div className="bg-white/12 border border-white/20 rounded-xl p-4 text-center text-white">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Languages className="h-5 w-5 text-emerald-300" />
                    <span className="text-2xl font-bold">{guide.languages.length}</span>
                  </div>
                  <p className="text-xs text-white/80">Languages</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {guide.specializations.map((spec) => (
                  <Badge key={spec} variant="secondary" className="text-sm px-3 py-1 border-white/20 bg-white/15 text-white">
                    {spec}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-4 text-sm text-white">
                {guide.experience && (
                  <div className="flex items-center gap-2 bg-white/12 px-3 py-2 rounded-lg border border-white/20">
                    <Award className="h-4 w-4 text-emerald-300" />
                    <span className="font-medium">{guide.experience}</span>
                  </div>
                )}
                {guide.responseTime && (
                  <div className="flex items-center gap-2 bg-white/12 px-3 py-2 rounded-lg border border-white/20">
                    <MessageCircle className="h-4 w-4 text-emerald-300" />
                    <span className="font-medium">Responds in {guide.responseTime}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Card */}
              <Card className="w-full md:w-80 border border-border/60 shadow-xl">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-2">Guide&apos;s Daily Rate</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-primary">
                      Rs. {guide.pricePerDay.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/day</span>
                  </div>
                  {days > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {days} days = Rs. {guideTotal().toLocaleString()}
                    </p>
                  )}
                </div>
                <Dialog open={bookingDialogOpen} onOpenChange={(open) => {
                  setBookingDialogOpen(open);
                  if (!open) {
                    if (!activeBooking) {
                      setBookingStep('details');
                    }
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg" disabled={!guide.available}>
                      {guide.available ? (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          Hire This Guide
                        </>
                      ) : (
                        'Currently Unavailable'
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
                    {/* Progress Steps */}
                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background px-6 py-4 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="font-semibold text-lg">Hire {guide.name}</h2>
                        <Badge variant="outline" className="bg-white/50">
                          Step {bookingStep === 'details' ? 1 : bookingStep === 'price' ? 2 : 3} of 3
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <div className={`h-1.5 flex-1 rounded-full transition-all ${bookingStep === 'details' ? 'bg-primary' : 'bg-primary'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-all ${bookingStep === 'price' ? 'bg-primary' : bookingStep === 'waiting' ? 'bg-primary' : 'bg-gray-200'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-all ${bookingStep === 'waiting' ? 'bg-primary' : 'bg-gray-200'}`} />
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Step 1: Trip Details */}
                      {bookingStep === 'details' && (
                        <>
                          <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-primary" />
                              Plan Your Adventure
                            </DialogTitle>
                            <DialogDescription className="text-base">
                              Tell us about your perfect trip with {guide.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  Start Date
                                </label>
                                <Input
                                  type="date"
                                  value={bookingData.startDate}
                                  onChange={(e) =>
                                    setBookingData({ ...bookingData, startDate: e.target.value })
                                  }
                                  min={new Date().toISOString().split('T')[0]}
                                  className="h-12"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  End Date
                                </label>
                                <Input
                                  type="date"
                                  value={bookingData.endDate}
                                  onChange={(e) =>
                                    setBookingData({ ...bookingData, endDate: e.target.value })
                                  }
                                  min={
                                    bookingData.startDate ||
                                    new Date().toISOString().split('T')[0]
                                  }
                                  className="h-12"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                Group Size
                              </label>
                              <Input
                                type="number"
                                value={bookingData.groupSize}
                                onChange={(e) =>
                                  setBookingData({
                                    ...bookingData,
                                    groupSize: parseInt(e.target.value) || 1,
                                  })
                                }
                                min="1"
                                max="20"
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Package Type</label>
                              <div className="grid grid-cols-3 gap-3">
                                {['Half Day Tour', 'Full Day Adventure', 'Multi-Day Expedition'].map((type) => (
                                  <button
                                    key={type}
                                    onClick={() => setBookingData({ ...bookingData, packageType: type })}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                      bookingData.packageType === type
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Special Requirements</label>
                              <Textarea
                                value={bookingData.specialRequirements}
                                onChange={(e) =>
                                  setBookingData({
                                    ...bookingData,
                                    specialRequirements: e.target.value,
                                  })
                                }
                                placeholder="Any special requests, dietary needs, accessibility requirements, or places you'd like to visit..."
                                rows={3}
                                className="resize-none"
                              />
                            </div>
                          </div>
                          <DialogFooter className="mt-6 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setBookingDialogOpen(false)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                if (!bookingData.startDate || !bookingData.endDate) {
                                  toast.error('Please select both start and end dates');
                                  return;
                                }
                                setBookingStep('price');
                              }}
                              className="flex-1 bg-gradient-to-r from-primary to-primary/90"
                            >
                              Continue
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </DialogFooter>
                        </>
                      )}

                      {/* Step 2: Price Proposal */}
                      {bookingStep === 'price' && (
                        <>
                          <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl flex items-center gap-2">
                              <Banknote className="h-5 w-5 text-primary" />
                              Propose Your Price
                            </DialogTitle>
                            <DialogDescription className="text-base">
                              Set a fair price for your {days}-day adventure. The guide can accept, counter, or decline.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-5">
                            {/* Guide rate reference card */}
                            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-muted-foreground">Guide&apos;s Standard Rate</span>
                                <span className="font-semibold text-lg">
                                  Rs. {guide.pricePerDay.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/day</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t">
                                <span className="text-sm text-muted-foreground">Total for {days} days</span>
                                <span className="font-bold text-xl text-primary">
                                  Rs. {guideTotal().toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Price input with comparison */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium flex items-center gap-2">
                                  <Banknote className="h-4 w-4 text-muted-foreground" />
                                  Your Offer
                                </label>
                                {priceDiff !== 0 && (
                                  <Badge
                                    variant={priceDiff >= 0 ? 'default' : 'secondary'}
                                    className={
                                      priceDiff >= 0
                                        ? 'bg-green-100 text-green-700 border-green-200'
                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                    }
                                  >
                                    {priceDiff > 0 ? '+' : ''}{priceDiff}% vs guide rate
                                  </Badge>
                                )}
                              </div>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-medium">
                                  Rs.
                                </span>
                                <Input
                                  type="number"
                                  value={offeredPrice}
                                  onChange={(e) =>
                                    setOfferedPrice(parseInt(e.target.value) || 0)
                                  }
                                  className="pl-12 text-2xl font-bold text-center h-14"
                                  min={0}
                                />
                              </div>
                              {guideTotal() > 0 && (
                                <Slider
                                  value={[offeredPrice]}
                                  onValueChange={(v) => setOfferedPrice(v[0])}
                                  min={Math.round(guideTotal() * 0.5)}
                                  max={Math.round(guideTotal() * 1.5)}
                                  step={100}
                                  className="py-2"
                                />
                              )}
                              <div className="flex justify-between text-xs text-muted-foreground px-1">
                                <span>50% off</span>
                                <span className="font-medium">Guide rate</span>
                                <span>50% above</span>
                              </div>
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium flex items-center gap-2">
                                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                                Message to {guide.name} (optional)
                              </label>
                              <Textarea
                                value={bookingData.message}
                                onChange={(e) =>
                                  setBookingData({ ...bookingData, message: e.target.value })
                                }
                                placeholder={`Tell ${guide.name} why they should accept your offer...`}
                                rows={3}
                                className="resize-none"
                              />
                            </div>

                            {/* Summary */}
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-primary" />
                                Booking Summary
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Trip Duration</span>
                                  <span className="font-semibold">{days} days</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Group Size</span>
                                  <span className="font-semibold">{bookingData.groupSize} person(s)</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Package</span>
                                  <span className="font-semibold">{bookingData.packageType}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Your Total Offer</span>
                                  <span className="text-2xl font-bold text-primary">
                                    Rs. {offeredPrice.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="mt-6 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setBookingStep('details')}
                              className="flex-1"
                            >
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Back
                            </Button>
                            <Button 
                              onClick={handleSendRequest} 
                              disabled={submitting}
                              className="flex-1 bg-gradient-to-r from-primary to-primary/90"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Request
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </>
                      )}

                      {/* Step 3: Waiting / Negotiation */}
                      {bookingStep === 'waiting' && activeBooking && (
                        <>
                          <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl flex items-center gap-2">
                              {activeBooking.status === 'confirmed' ? (
                                <>
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                  Booking Confirmed!
                                </>
                              ) : activeBooking.status === 'declined' ? (
                                <>
                                  <X className="h-5 w-5 text-red-500" />
                                  Request Declined
                                </>
                              ) : (
                                <>
                                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                  Live Request Status
                                </>
                              )}
                            </DialogTitle>
                            <DialogDescription className="text-base">
                              {activeBooking.status === 'pending' &&
                                `Your request has been sent to ${guide.name}. Waiting for their response...`}
                              {activeBooking.status === 'negotiating' &&
                                `${guide.name} has sent a counter offer. Review and respond below.`}
                              {activeBooking.status === 'confirmed' &&
                                'Your booking has been confirmed! Get ready for your adventure.'}
                              {activeBooking.status === 'declined' &&
                                `Unfortunately, ${guide.name} is not available for these dates.`}
                            </DialogDescription>
                          </DialogHeader>

                        <LiveRequestCard
                          status={activeBooking.status}
                          offeredPrice={activeBooking.offeredPrice}
                          counterPrice={activeBooking.counterPrice}
                          agreedPrice={activeBooking.agreedPrice}
                          expiresAt={activeBooking.expiresAt}
                          onCancel={handleCancelBooking}
                          guideName={guide.name}
                        />

                        {activeBooking.negotiationHistory.length > 0 && (
                          <div className="border rounded-lg overflow-hidden">
                            <NegotiationPanel
                              history={activeBooking.negotiationHistory}
                              currentUserRole="tourist"
                              guideRate={guide.pricePerDay}
                              numberOfDays={activeBooking.numberOfDays || days}
                              onAcceptPrice={handleAcceptPrice}
                              status={activeBooking.status}
                            />
                          </div>
                        )}

                        {/* Revise offer section for tourist during negotiation */}
                        {activeBooking.status === 'negotiating' && (
                          <ReviseOfferForm
                            currentPrice={
                              activeBooking.negotiationHistory[
                                activeBooking.negotiationHistory.length - 1
                              ]?.price || offeredPrice
                            }
                            onRevise={handleReviseOffer}
                          />
                        )}

                        {activeBooking.status === 'confirmed' && (
                          <div className="text-center">
                            <Link href="/user/bookings">
                              <Button size="lg">
                                View My Bookings
                              </Button>
                            </Link>
                          </div>
                        )}

                        {['declined', 'expired', 'cancelled'].includes(
                          activeBooking.status
                        ) && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setActiveBooking(null);
                              setBookingStep('details');
                            }}
                          >
                            Try Again
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  </DialogContent>
                </Dialog>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Propose your price - the guide can accept, counter, or decline
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {guide.bio && (
              <div>
                <h2 className="font-serif text-2xl font-bold mb-4">About {guide.name}</h2>
                <p className="text-muted-foreground leading-relaxed">{guide.bio}</p>
              </div>
            )}

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-bold">
                  {reviews.length > 0 ? `Reviews (${reviews.length})` : 'Reviews'}
                </h2>
                {reviews.length === 0 && (
                  <Badge variant="outline" className="text-muted-foreground">No reviews yet</Badge>
                )}
              </div>

              {reviews.length === 0 ? (
                <Card className="border-dashed border-border/60 bg-muted/20">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="h-8 w-8 text-primary/60" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No Reviews Yet</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                      {guide.name} is a new guide waiting for their first adventure. Be the first to hire them and leave a review!
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Verified by Yatra</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="bg-card border rounded-xl p-6 text-center">
                      <div className="text-6xl font-bold mb-2 text-primary">{guide.rating}</div>
                      <div className="flex justify-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= Math.round(guide.rating)
                                ? 'fill-secondary text-secondary'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Based on {guide.reviewCount} reviews
                      </p>
                    </div>

                    <div className="space-y-3">
                      {ratingBreakdown.map((item) => (
                        <div key={item.stars} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-8">{item.stars}★</span>
                          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-secondary rounded-full transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-10 text-right">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <Card key={review._id} className="border border-border/50 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="font-semibold text-primary">
                                  {review.reviewer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold">{review.reviewer.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(review.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-secondary/10 px-2 py-1 rounded-lg">
                              <Star className="h-4 w-4 fill-secondary text-secondary" />
                              <span className="font-semibold text-sm">{review.rating}</span>
                            </div>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{review.comment}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Recent Trips — Feature 2 */}
            {bookingHistory.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Route className="h-5 w-5 text-primary" />
                  </div>
                  Recent Trips
                </h2>
                <div className="space-y-3">
                  {bookingHistory.map((trip) => (
                    <Card key={trip.id} className="border border-border/50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{trip.route}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="h-3 w-3" />
                                {trip.durationDays} day{trip.durationDays !== 1 ? 's' : ''}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(trip.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Customer from {trip.customerFrom}
                              </span>
                            </div>
                          </div>
                          {trip.rating && (
                            <div className="flex items-center gap-1 bg-secondary/10 px-2 py-1 rounded-lg flex-shrink-0">
                              <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                              <span className="font-semibold text-sm">{trip.rating}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {trip.destinations.map((d, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {d.name}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {bookingHistory.length < historyTotal && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    disabled={historyLoading}
                    onClick={() => fetchBookingHistory(historyPage + 1)}
                  >
                    {historyLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    View More Trips
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border border-border/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  Guide Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Member Since</span>
                  </div>
                  <span className="font-semibold">2022</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total Trips</span>
                  </div>
                  <span className="font-semibold">{guide.totalTrips || 0}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Response</span>
                  </div>
                  <span className="font-semibold">{guide.responseTime || '24h'}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Languages className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Languages</span>
                  </div>
                  <span className="font-semibold">{guide.languages.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-emerald-200/60 dark:border-emerald-800/40 shadow-lg bg-emerald-50/40 dark:bg-emerald-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  Safety Verified
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-green-500/20 rounded-full mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Identity Verified</p>
                    <p className="text-xs text-muted-foreground">
                      Government ID confirmed
                    </p>
                  </div>
                </div>
                {guide.verified && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-green-500/20 rounded-full mt-0.5">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Certified Guide</p>
                      <p className="text-xs text-muted-foreground">
                        Licensed by tourism board
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for tourist to revise their offer
function ReviseOfferForm({
  currentPrice,
  onRevise,
}: {
  currentPrice: number;
  onRevise: (price: number, message: string) => void;
}) {
  const [price, setPrice] = useState(currentPrice);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    setSending(true);
    await onRevise(price, message);
    setMessage('');
    setSending(false);
  };

  return (
    <div className="p-4 border rounded-lg bg-muted/30">
      <p className="text-sm font-medium mb-3">Revise Your Offer</p>
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
            placeholder="Your new price"
            className="h-10"
          />
        </div>
      </div>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a message..."
        rows={2}
        className="mb-2"
      />
      <Button onClick={handleSubmit} disabled={sending} size="sm" className="w-full">
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Send Revised Offer
      </Button>
    </div>
  );
}
