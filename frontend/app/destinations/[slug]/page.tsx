'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  MapPin,
  Star,
  Clock,
  Users,
  Mountain,
  Calendar,
  ArrowLeft,
  Heart,
  Share2,
  Camera,
  Compass,
  CheckCircle,
  AlertCircle,
  Wifi,
  Phone,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { formatNPR } from '@/lib/currency';

interface Destination {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  region: string;
  difficulty: string;
  duration: string;
  altitude: string;
  bestSeason: string[];
  images: string[];
  highlights: string[];
  included: string[];
  excluded: string[];
  requirements: string[];
  rating: number;
  reviewCount: number;
  location: {
    type: string;
    coordinates: [number, number];
  };
  guideCount: number;
  priceRange: {
    min: number;
    max: number;
  };
}

interface Guide {
  _id: string;
  name: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  pricePerDay: number;
  specializations: string[];
  verified: boolean;
  available: boolean;
}

export default function DestinationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (params.slug) {
      fetchDestinationDetails();
    }
  }, [params.slug]);

  const fetchDestinationDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch destination details
      const destResponse = await api.get(`/destinations/slug/${params.slug}`);
      setDestination(destResponse.data.data);
      
      // Fetch available guides for this destination
      const guidesResponse = await api.get(`/guides?destination=${destResponse.data.data._id}`);
      setGuides(guidesResponse.data.data || []);
      
    } catch (error) {
      console.error('Failed to fetch destination details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDestination = async () => {
    try {
      if (isSaved) {
        await api.delete(`/wishlist/destination/${destination?._id}`);
        setIsSaved(false);
      } else {
        await api.post(`/wishlist/destination/${destination?._id}`);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Failed to save destination:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: destination?.name,
          text: destination?.shortDescription,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-64 sm:h-80">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Destination Not Found</h2>
          <p className="text-muted-foreground mb-4">This destination doesn't exist or has been removed.</p>
          <Button onClick={() => router.push('/destinations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Destinations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 lg:h-96">
        <Image
          src={destination.images[0] || '/placeholder.jpg'}
          alt={destination.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.back()}
            className="bg-white/20 backdrop-blur-sm border-white/30"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveDestination}
            className="bg-white/20 backdrop-blur-sm border-white/30"
          >
            <Heart className={`h-4 w-4 ${isSaved ? 'fill-current text-red-500' : ''}`} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            className="bg-white/20 backdrop-blur-sm border-white/30"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Title Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {destination.name}
            </h1>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{destination.region}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm">{destination.rating.toFixed(1)}</span>
                <span className="text-xs">({destination.reviewCount} reviews)</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">{destination.duration}</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Mountain className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">{destination.altitude}</div>
                  <div className="text-xs text-muted-foreground">Altitude</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">{destination.difficulty}</div>
                  <div className="text-xs text-muted-foreground">Difficulty</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Compass className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">{destination.guideCount}</div>
                  <div className="text-xs text-muted-foreground">Guides</div>
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div>
                <h2 className="text-2xl font-bold mb-4">About {destination.name}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {destination.description}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {destination.shortDescription}
                </p>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Tabs defaultValue="highlights" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="highlights">Highlights</TabsTrigger>
                  <TabsTrigger value="included">Included</TabsTrigger>
                  <TabsTrigger value="requirements">Requirements</TabsTrigger>
                  <TabsTrigger value="season">Best Season</TabsTrigger>
                </TabsList>
                
                <TabsContent value="highlights" className="mt-6">
                  <div className="grid gap-3">
                    {destination.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="included" className="mt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-green-600">What's Included</h4>
                      <div className="grid gap-2">
                        {destination.included.map((item, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2 text-red-600">What's Not Included</h4>
                      <div className="grid gap-2">
                        {destination.excluded.map((item, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="requirements" className="mt-6">
                  <div className="grid gap-3">
                    {destination.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="season" className="mt-6">
                  <div className="flex flex-wrap gap-2">
                    {destination.bestSeason.map((season, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {season}
                      </Badge>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Available Guides */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Available Guides</h2>
                <Link href={`/guides?destination=${destination._id}`}>
                  <Button variant="outline">
                    View All Guides
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                </Link>
              </div>
              
              {guides.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {guides.slice(0, 4).map((guide) => (
                    <Card key={guide._id} className="group border border-border/60 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="relative h-12 w-12 flex-shrink-0">
                            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary/20">
                              <Image
                                src={guide.avatar || '/placeholder.svg'}
                                alt={guide.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            {guide.verified && (
                              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-blue-500 border-2 border-white">
                                <CheckCircle className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{guide.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Star className="h-3 w-3 fill-current" />
                              <span>{guide.rating.toFixed(1)}</span>
                              <span>({guide.reviewCount})</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-medium text-primary">
                                {formatNPR(guide.pricePerDay)}/day
                              </span>
                              <Link href={`/guides/${guide._id}`}>
                                <Button size="sm" className="text-xs">
                                  View Profile
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-border/60 bg-muted/20">
                  <CardContent className="py-12 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No Guides Available</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      There are currently no guides available for this destination.
                    </p>
                    <Link href="/guides">
                      <Button variant="outline">
                        Browse All Guides
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Book This Adventure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {formatNPR(destination.priceRange.min)}-{formatNPR(destination.priceRange.max)}
                    </div>
                    <div className="text-sm text-muted-foreground">per person</div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{destination.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Difficulty:</span>
                      <span className="font-medium">{destination.difficulty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available Guides:</span>
                      <span className="font-medium">{destination.guideCount}</span>
                    </div>
                  </div>
                  
                  <Link href={`/guides?destination=${destination._id}`}>
                    <Button className="w-full" size="lg">
                      Find Guides
                    </Button>
                  </Link>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    Compare guides and prices to find your perfect match
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>+977-1-1234567</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Wifi className="h-4 w-4 text-primary" />
                    <span>support@yatra.com</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-primary" />
                    <span>www.yatra.com</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
