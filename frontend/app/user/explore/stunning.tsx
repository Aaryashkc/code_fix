'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  X,
  Sparkles,
  Compass,
  TrendingUp,
  Users,
  Calendar,
  Star,
  Heart,
  Navigation,
  Filter,
  Search,
  Globe,
  Camera,
  Mountain,
  Trees,
  Building,
  Music,
  Utensils,
  Hotel,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { toast } from 'sonner';
import Link from 'next/link';

const StunningExploreMap = dynamic(() => import('@/components/map/StunningExploreMap'), { ssr: false });

interface Destination {
  _id: string;
  name: string;
  slug: string;
  category: string;
  images: string[];
  rating: number;
  shortDescription?: string;
  location: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  bestTimeToVisit?: string;
  duration?: string;
  difficulty?: string;
  price?: string;
  tags?: string[];
  reviews?: number;
}

// Enhanced category system
const categorySystem = {
  Adventure: { 
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-gradient-to-br from-emerald-500/20 to-teal-600/20',
    border: 'border-emerald-500/30',
    icon: Mountain,
    emoji: '🏔️'
  },
  Nature: { 
    color: 'from-cyan-500 to-blue-600',
    bg: 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20',
    border: 'border-cyan-500/30',
    icon: Trees,
    emoji: '🌲'
  },
  Religious: { 
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-gradient-to-br from-amber-500/20 to-orange-600/20',
    border: 'border-amber-500/30',
    icon: Compass,
    emoji: '🛕'
  },
  Cultural: { 
    color: 'from-purple-500 to-pink-600',
    bg: 'bg-gradient-to-br from-purple-500/20 to-pink-600/20',
    border: 'border-purple-500/30',
    icon: Music,
    emoji: '🎭'
  },
  Urban: { 
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-gradient-to-br from-blue-500/20 to-indigo-600/20',
    border: 'border-blue-500/30',
    icon: Building,
    emoji: '🏙️'
  }
};

// Enhanced activity types
const activityTypes = [
  { id: 'all', name: 'All Places', icon: Globe, color: 'from-slate-500 to-gray-600' },
  { id: 'adventure', name: 'Adventure', icon: Mountain, color: 'from-emerald-500 to-teal-600' },
  { id: 'nature', name: 'Nature', icon: Trees, color: 'from-cyan-500 to-blue-600' },
  { id: 'religious', name: 'Religious', icon: Compass, color: 'from-amber-500 to-orange-600' },
  { id: 'cultural', name: 'Cultural', icon: Music, color: 'from-purple-500 to-pink-600' },
  { id: 'urban', name: 'Urban', icon: Building, color: 'from-blue-500 to-indigo-600' },
  { id: 'food', name: 'Food & Drink', icon: Utensils, color: 'from-orange-500 to-red-600' },
  { id: 'stay', name: 'Hotels', icon: Hotel, color: 'from-indigo-500 to-purple-600' },
  { id: 'shop', name: 'Shopping', icon: ShoppingBag, color: 'from-pink-500 to-rose-600' },
  { id: 'photo', name: 'Photo Spots', icon: Camera, color: 'from-yellow-500 to-orange-600' }
];

export default function StunningExplorePage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [userStats, setUserStats] = useState({
    totalPlaces: 0,
    avgRating: 0,
    categories: 0,
    trending: 0
  });

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/destinations');
      const data = res.data.data || [];
      setDestinations(data);
      
      // Calculate stats
      const stats = {
        totalPlaces: data.length,
        avgRating: data.reduce((acc: number, d: Destination) => acc + (d.rating || 0), 0) / data.length,
        categories: new Set(data.map((d: Destination) => d.category)).size,
        trending: data.filter((d: Destination) => d.rating >= 4.5).length
      };
      setUserStats(stats);
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
      toast.error('Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  const handleDestinationSelect = useCallback((destination: Destination) => {
    setSelectedDestination(destination);
    toast.success(`Selected: ${destination.name}`);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Filter destinations
  const filteredDestinations = destinations.filter(d => {
    const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
    const matchesActivity = selectedActivity === 'all' || d.category.toLowerCase().includes(selectedActivity.toLowerCase());
    const matchesSearch = !searchQuery || 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.location.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesActivity && matchesSearch;
  });

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-cyan-500/20 border-b-cyan-500 rounded-full animate-spin animation-delay-150"></div>
            <div className="absolute inset-4 w-16 h-16 border-4 border-purple-500/20 border-l-purple-500 rounded-full animate-spin animation-delay-300"></div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Discovering Nepal</h2>
          <p className="text-slate-400">Loading amazing destinations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Stunning Header */}
      <div className="relative z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30">
                  <Sparkles className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Explore Nepal</h1>
                  <p className="text-slate-400">Discover extraordinary destinations</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{userStats.totalPlaces}</div>
                  <div className="text-xs text-slate-400">Places</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{userStats.categories}</div>
                  <div className="text-xs text-slate-400">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{userStats.avgRating.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">Avg Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{userStats.trending}</div>
                  <div className="text-xs text-slate-400">Trending</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-120px)] relative">
        {/* Stunning Map */}
        <div className="h-full">
          <StunningExploreMap
            destinations={filteredDestinations}
            onDestinationSelect={handleDestinationSelect}
            onSearch={handleSearch}
            height="100%"
          />
        </div>

        {/* Quick Filters */}
        <div className="absolute top-6 left-6 z-[1000]">
          <GlassCard className="p-4 backdrop-blur-xl bg-slate-900/90 border-white/20">
            <div className="space-y-4">
              {/* Categories */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  Categories
                </h3>
                <div className="flex flex-col gap-2">
                  {Object.entries(categorySystem).map(([key, category]) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
                        className={`w-full p-3 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                          selectedCategory === key
                            ? 'bg-gradient-to-r ' + category.color + ' text-white border-transparent shadow-lg'
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{key}</span>
                        <span className="ml-auto text-sm opacity-75">
                          {destinations.filter(d => d.category === key).length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activity Types */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  Activities
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {activityTypes.slice(0, 6).map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <button
                        key={activity.id}
                        onClick={() => setSelectedActivity(activity.id)}
                        className={`p-2 rounded-lg border transition-all duration-200 flex flex-col items-center gap-1 ${
                          selectedActivity === activity.id
                            ? 'bg-gradient-to-br ' + activity.color + ' text-white border-transparent'
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{activity.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Search Bar */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000]">
          <GlassCard className="p-4 backdrop-blur-xl bg-slate-900/90 border-white/20 w-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search destinations..."
                className="w-full pl-10 pr-10 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Results Counter */}
        <div className="absolute top-6 right-6 z-[1000]">
          <GlassCard className="px-4 py-3 backdrop-blur-xl bg-slate-900/90 border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">{filteredDestinations.length} places found</span>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Selected Destination Modal */}
      <AnimatePresence>
        {selectedDestination && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setSelectedDestination(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedDestination.name}</h2>
                  <p className="text-slate-300">{selectedDestination.location.address}</p>
                </div>
                <button
                  onClick={() => setSelectedDestination(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {selectedDestination.images && selectedDestination.images.length > 0 && (
                <div className="mb-4">
                  <img 
                    src={selectedDestination.images[0]} 
                    alt={selectedDestination.name}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>
              )}

              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${categorySystem[selectedDestination.category as keyof typeof categorySystem]?.color} text-white`}>
                  {categorySystem[selectedDestination.category as keyof typeof categorySystem]?.emoji} {selectedDestination.category}
                </span>
                <span className="text-yellow-400">⭐ {selectedDestination.rating}</span>
                {selectedDestination.reviews && (
                  <span className="text-slate-400">({selectedDestination.reviews} reviews)</span>
                )}
              </div>

              {selectedDestination.shortDescription && (
                <p className="text-slate-300 mb-4">{selectedDestination.shortDescription}</p>
              )}

              <div className="flex gap-3">
                <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold">
                  <Heart className="h-4 w-4 mr-2" />
                  Save to Wishlist
                </Button>
                <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold">
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Link href={`/places/${selectedDestination._id}`} className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold">
                    View Details
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes animation-delay-150 {
          0%, 80% { opacity: 0; }
          90%, 100% { opacity: 1; }
        }
        @keyframes animation-delay-300 {
          0%, 70% { opacity: 0; }
          80%, 100% { opacity: 1; }
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}
