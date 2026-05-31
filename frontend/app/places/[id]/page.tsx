'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, MapPin, Calendar, Heart, Share2, ArrowLeft,
  Clock, Banknote, Users, CheckCircle, Info, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false });
import { getNearbyAttractions } from '@/lib/mapUtils';
import { formatDistance } from '@/lib/distanceUtils';
import { toast } from 'sonner';

interface Place {
  _id: string;
  name: string;
  category: string;
  region: string;
  description: string;
  shortDescription?: string;
  images: string[];
  rating: number;
  reviewCount: number;
  location: {
    coordinates: [number, number];
    address: string;
  };
  difficulty?: string;
  duration?: string;
  bestSeason?: string;
  features?: string[];
  priceRange?: string;
}

interface Review {
  _id: string;
  reviewer: {
    _id: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

export default function PlaceDetailPage() {
  const params = useParams();
  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [availableGuides, setAvailableGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPlaceDetails();
    }
  }, [params.id]);

  const fetchPlaceDetails = async () => {
    try {
      // Fetch destination first - this is the critical request
      const placeRes = await api.get(`/destinations/${params.id}`);
      const placeData = placeRes.data.data;

      if (!placeData) {
        setLoading(false);
        return;
      }

      setPlace(placeData);

      // Fetch supplementary data - don't let failures break the page
      const [placesRes, guidesRes, reviewsRes] = await Promise.all([
        api.get('/destinations').catch(() => ({ data: { data: [] } })),
        api.get('/guides').catch(() => ({ data: { data: [] } })),
        api.get(`/reviews/destination/${params.id}`).catch(() => ({ data: { data: [] } })),
      ]);
      setAvailableGuides(guidesRes.data.data?.slice(0, 3) || []);
      setReviews(reviewsRes.data.data || []);

      // Calculate nearby places
      if (placeData.location?.coordinates) {
        const [lng, lat] = placeData.location.coordinates;
        const nearby = getNearbyAttractions(
          lat,
          lng,
          placesRes.data.data || [],
          50
        ).filter((p: any) => p._id !== placeData._id).slice(0, 4);
        setNearbyPlaces(nearby);
      }
    } catch (error) {
      console.error('Failed to fetch place details:', error);
      toast.error('Failed to load place details');
    } finally {
      setLoading(false);
    }
  };

  const toggleSaved = async () => {
    try {
      if (isSaved) {
        await api.delete(`/wishlist/${params.id}`);
        toast.success('Removed from saved places');
      } else {
        await api.post(`/wishlist/${params.id}`);
        toast.success('Added to saved places');
      }
      setIsSaved(!isSaved);
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmittingReview(true);
    try {
      const response = await api.post(`/reviews/destination/${params.id}`, {
        rating: reviewRating,
        comment: reviewComment
      });
      toast.success('Review submitted successfully!');
      setReviews([response.data.data, ...reviews]);
      setReviewDialogOpen(false);
      setReviewRating(5);
      setReviewComment('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>;
  }

  if (!place) {
    return <div className="container mx-auto p-8">Place not found</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Link href="/user/places">
          <Button variant="outline" size="sm" className="rounded-xl border border-border/60 bg-card">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Places
          </Button>
        </Link>
      </div>

      {/* Image Gallery */}
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-2 h-[500px]">
          <div className="relative overflow-hidden rounded-2xl">
            <Image
              src={place.images[currentImageIndex] || '/placeholder.svg'}
              alt={place.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {place.images.slice(1, 5).map((img, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-2xl cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setCurrentImageIndex(idx + 1)}
              >
                <Image src={img} alt={`${place.name} ${idx + 2}`} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{place.category}</Badge>
                    <Badge variant="outline">{place.region}</Badge>
                    {place.difficulty && <Badge variant="secondary">{place.difficulty}</Badge>}
                  </div>
                  <h1 className="font-serif text-4xl font-bold">{place.name}</h1>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-secondary text-secondary" />
                      <span className="text-lg font-semibold">{place.rating}</span>
                      <span className="text-muted-foreground">
                        ({place.reviewCount} reviews)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{place.location.address}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-xl border border-border/60 bg-card" onClick={toggleSaved}>
                      <Heart className={`h-5 w-5 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-xl border border-border/60 bg-card">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
              </div>

              <Separator />
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {place.duration && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-semibold">{place.duration}</p>
                  </div>
                </div>
              )}
              {place.bestSeason && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Best Season</p>
                    <p className="font-semibold">{place.bestSeason}</p>
                  </div>
                </div>
              )}
              {place.priceRange && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  <Banknote className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Price Range</p>
                    <p className="font-semibold">{place.priceRange}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="font-serif text-2xl font-bold mb-4">About This Place</h2>
              <p className="text-muted-foreground leading-relaxed">{place.description}</p>
            </div>

            {/* Features */}
            {place.features && place.features.length > 0 && (
              <div>
                <h2 className="font-serif text-2xl font-bold mb-4">What to Expect</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {place.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            <div>
              <h2 className="font-serif text-2xl font-bold mb-4">Location</h2>
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="p-4">
                  <MapAdvanced
                    center={[place.location.coordinates[1], place.location.coordinates[0]]}
                    zoom={13}
                    height="400px"
                    markers={[
                      {
                        position: [place.location.coordinates[1], place.location.coordinates[0]],
                        title: place.name,
                        category: place.category,
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-2xl font-bold">
                  Reviews ({reviews.length})
                </h2>
                <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Write a Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Write a Review for {place.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
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
                        <label className="text-sm font-medium mb-2 block">Your Review</label>
                        <Textarea
                          placeholder="Share your experience at this place..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <Button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || !reviewComment.trim()}
                        className="w-full"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {reviews.length === 0 ? (
                <Card className="border border-dashed border-border/60 shadow-none">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No reviews yet. Be the first to review this place!
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review._id} className="border border-border/60 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="relative h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {review.reviewer.avatar ? (
                              <Image src={review.reviewer.avatar} alt={review.reviewer.name} fill sizes="40px" className="object-cover" />
                            ) : (
                              <span className="font-semibold">{review.reviewer.name[0]}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{review.reviewer.name}</p>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-secondary text-secondary" />
                                <span className="text-sm font-medium">{review.rating}</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                            <p className="mt-2">{review.comment}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Available Guides */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Available Guides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableGuides.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No guides available</p>
                ) : (
                  availableGuides.map((guide) => (
                    <Link key={guide._id} href={`/guides/${guide._id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors">
                        <div className="relative h-12 w-12 rounded-full overflow-hidden">
                          <Image
                            src={guide.avatar || '/placeholder.svg'}
                            alt={guide.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{guide.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-secondary text-secondary" />
                            <span className="text-sm">{guide.rating}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">Rs. {guide.pricePerDay?.toLocaleString()}/day</p>
                          <p className="text-xs text-muted-foreground">/day</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
                <Link href="/user/guides">
                  <Button className="w-full">View All Guides</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Nearby Places */}
            {nearbyPlaces.length > 0 && (
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Nearby Attractions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {nearbyPlaces.map((nearby: any) => (
                    <Link key={nearby._id} href={`/places/${nearby._id}`}>
                      <div className="flex gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={nearby.images[0] || '/placeholder.svg'}
                            alt={nearby.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{nearby.name}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {formatDistance(nearby.distance)} away
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
