'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { haversineDistance, formatDistance } from '@/lib/distanceUtils';
import { fetchSnacksAlongRoute, RouteSnackStop } from '@/lib/overpassService';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { 
  Search, 
  Navigation, 
  Filter, 
  Heart,
  Share2,
  X,
  Loader2,
  Mountain,
  Trees,
  Compass,
  Music,
  Building,
  Camera,
  Utensils,
  Hotel,
  ShoppingBag,
  Sparkles,
  Globe,
  Map,
  Layers,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { escapeHtml, validateUrl } from '@/lib/htmlUtils';

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
}

interface StunningMapProps {
  destinations: Destination[];
  onDestinationSelect?: (destination: Destination) => void;
  onSearch?: (query: string) => void;
  height?: string;
}

// Enhanced category system with professional icons and gradients
const categorySystem = {
  Adventure: { 
    icon: Mountain, 
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-gradient-to-br from-emerald-500/20 to-teal-600/20',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/25'
  },
  Nature: { 
    icon: Trees, 
    color: 'from-cyan-500 to-blue-600',
    bg: 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/25'
  },
  Religious: { 
    icon: Compass, 
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-gradient-to-br from-amber-500/20 to-orange-600/20',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/25'
  },
  Cultural: { 
    icon: Music, 
    color: 'from-purple-500 to-pink-600',
    bg: 'bg-gradient-to-br from-purple-500/20 to-pink-600/20',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/25'
  },
  Urban: { 
    icon: Building, 
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-gradient-to-br from-blue-500/20 to-indigo-600/20',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/25'
  }
};

// Activity types for enhanced filtering
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

function StunningMapInner({
  destinations = [],
  onDestinationSelect,
  onSearch,
  height = '500px'
}: StunningMapProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<any>(null);
  const userLocationLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const routeSnackLayerRef = useRef<any>(null);
  const routeControlRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [showLayers, setShowLayers] = useState(false);
  const [activeRoute, setActiveRoute] = useState<{ destinationName: string; distance: string; duration: string } | null>(null);
  const [routeSnacks, setRouteSnacks] = useState<RouteSnackStop[]>([]);
  const [snackPanelDismissed, setSnackPanelDismissed] = useState(false);

  // Advanced filtering system
  const filteredDestinations = useMemo(() => {
    let filtered = destinations;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(d => d.category === selectedCategory);
    }
    
    if (selectedActivity !== 'all') {
      // Enhanced activity filtering logic
      filtered = filtered.filter(d => {
        // Add activity-specific filtering logic here
        return d.category.toLowerCase().includes(selectedActivity.toLowerCase());
      });
    }
    
    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [destinations, selectedCategory, selectedActivity, searchQuery]);

  // Smart sorting with multiple options
  const sortedDestinations = useMemo(() => {
    if (!userLocation) return filteredDestinations;
    
    return filteredDestinations
      .map(d => ({
        ...d,
        distance: haversineDistance(
          userLocation[0], 
          userLocation[1], 
          d.location.coordinates[1], 
          d.location.coordinates[0]
        ),
        score: calculateDestinationScore(d, userLocation)
      }))
      .sort((a, b) => b.score - a.score); // Sort by score
  }, [filteredDestinations, userLocation]);

  // Calculate destination score based on multiple factors
  const calculateDestinationScore = (dest: Destination, userLoc: [number, number]): number => {
    const distance = haversineDistance(userLoc[0], userLoc[1], dest.location.coordinates[1], dest.location.coordinates[0]);
    const rating = dest.rating || 0;
    const distanceScore = Math.max(0, 100 - distance);
    const ratingScore = rating * 10;
    return distanceScore + ratingScore;
  };

  const getFoodStopLabel = (type: RouteSnackStop['type']) => {
    if (type === 'cafe') return 'Cafe';
    if (type === 'fast_food') return 'Quick Bite';
    return 'Restaurant';
  };

  const getFoodStopInitials = (type: RouteSnackStop['type']) => {
    if (type === 'cafe') return 'CF';
    if (type === 'fast_food') return 'QB';
    return 'RS';
  };

  const createFoodStopMarker = (type: RouteSnackStop['type']) => `
    <div style="
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: #f97316;
      border: 2px solid #fed7aa;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.34);
      animation: routeFoodIn 220ms ease-out both;
    ">${getFoodStopInitials(type)}</div>
  `;

  // Initialize stunning map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    const initMap = async (center: [number, number]) => {
      const L = (await import('leaflet')).default;
      leafletRef.current = L;

      // Enhanced Leaflet setup
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current) return;

      // Create map with enhanced settings
      mapRef.current = L.map(mapContainerRef.current!, {
        center: center,
        zoom: 13,
        zoomControl: false, // Custom zoom controls
        scrollWheelZoom: true,
        preferCanvas: true,
        worldCopyJump: true,
        bounceAtZoomLimits: true,
      });

      // Enhanced tile layers
      const tileLayers = {
        standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
          updateWhenIdle: true,
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri',
          maxZoom: 19,
        }),
        terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenTopoMap',
          maxZoom: 17,
        })
      };

      tileLayers[mapStyle].addTo(mapRef.current);

      // Create enhanced layers
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
      userLocationLayerRef.current = L.layerGroup().addTo(mapRef.current);
      routeLayerRef.current = L.layerGroup().addTo(mapRef.current);
      routeSnackLayerRef.current = L.layerGroup().addTo(mapRef.current);

      // Custom zoom controls
      L.control.zoom({
        position: 'topright',
        zoomInText: '+',
        zoomOutText: '-'
      }).addTo(mapRef.current);

      setIsReady(true);
    };

    // Get user location with enhanced accuracy
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          initMap([latitude, longitude]);
          toast.success('📍 Location found! Showing nearby places');
        },
        () => {
          initMap([27.7172, 85.324]); // Kathmandu
          toast.info('📍 Showing Kathmandu area');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 600000 }
      );
    } else {
      initMap([27.7172, 85.324]);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapStyle]);

  // Create stunning markers
  const createStunningMarker = useCallback((destination: Destination, index: number) => {
    if (!leafletRef.current) return null;

    const L = leafletRef.current;
    const category = categorySystem[destination.category as keyof typeof categorySystem] || categorySystem.Urban;
    const Icon = category.icon;
    const [lng, lat] = destination.location.coordinates;

    // Create beautiful marker HTML
    const markerHtml = `
      <div class="stunning-marker" style="
        width: 48px;
        height: 56px;
        position: relative;
        animation: markerDrop 0.6s ease-out ${index * 0.1}s both;
      ">
        <div style="
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, ${category.color.replace('from-', '').replace(' to-', ', ')});
          border: 3px solid rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
          position: relative;
          z-index: 2;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${generateIconPath()}
          </svg>
        </div>
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-top: 16px solid;
          border-top-color: ${category.color.split(' ')[1]};
          z-index: 1;
        "></div>
        <div style="
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        ">
          ⭐${destination.rating || '4.5'}
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: '',
      iconSize: [48, 56],
      iconAnchor: [24, 56],
      popupAnchor: [0, -56],
    });

    return L.marker([lat, lng], { icon: customIcon });
  }, []);

  // Generate SVG icon paths
  const generateIconPath = (): string => {
    // Simplified icon path generation - in production, use actual SVG paths
    return '<circle cx="12" cy="12" r="10"></circle>';
  };

  // Update markers with stunning animations
  useEffect(() => {
    if (!isReady || !markersLayerRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    markersLayerRef.current.clearLayers();

    sortedDestinations.forEach((destination, index) => {
      const marker = createStunningMarker(destination, index);
      if (marker) {
        // Create beautiful popup
        const popupContent = `
          <div style="
            min-width: 280px;
            font-family: system-ui;
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
            border-radius: 16px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
          ">
            ${destination.images && destination.images.length > 0 ? `
              <div style="
                height: 120px;
                background: linear-gradient(135deg, ${categorySystem[destination.category as keyof typeof categorySystem]?.color || '#64748b'});
                position: relative;
                overflow: hidden;
              ">
                <img src="${validateUrl(destination.images[0])}" style="
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  opacity: 0.8;
                " />
                <div style="
                  position: absolute;
                  top: 8px;
                  right: 8px;
                  background: rgba(0, 0, 0, 0.6);
                  color: white;
                  padding: 4px 8px;
                  border-radius: 12px;
                  font-size: 12px;
                  backdrop-filter: blur(10px);
                ">
                  ⭐ ${destination.rating}
                </div>
              </div>
            ` : ''}
            <div style="padding: 16px;">
              <h3 style="
                margin: 0 0 8px 0;
                font-size: 18px;
                font-weight: 700;
                color: white;
                line-height: 1.2;
              ">${escapeHtml(destination.name)}</h3>
              ${destination.shortDescription ? `
                <p style="
                  margin: 0 0 12px 0;
                  font-size: 14px;
                  color: rgba(255, 255, 255, 0.7);
                  line-height: 1.4;
                ">${escapeHtml(destination.shortDescription)}</p>
              ` : ''}
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
              ">
                <span style="
                  background: linear-gradient(135deg, ${categorySystem[destination.category as keyof typeof categorySystem]?.color || '#64748b'});
                  color: white;
                  padding: 4px 12px;
                  border-radius: 16px;
                  font-size: 12px;
                  font-weight: 600;
                ">${escapeHtml(destination.category)}</span>
                ${userLocation ? `
                  <span style="
                    color: #10b981;
                    font-size: 13px;
                    font-weight: 500;
                  ">📍 ${formatDistance(haversineDistance(userLocation[0], userLocation[1], destination.location.coordinates[1], destination.location.coordinates[0]))}</span>
                ` : ''}
              </div>
              <div style="
                display: flex;
                gap: 8px;
              ">
                <button data-destination-id="${destination._id}" data-action="select" style="
                  background: linear-gradient(135deg, #10b981, #059669);
                  color: white;
                  border: none;
                  padding: 10px 16px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                  flex: 1;
                  transition: all 0.2s;
                ">View Details</button>
                <button data-destination-id="${destination._id}" data-action="save" style="
                  background: rgba(255, 255, 255, 0.1);
                  color: white;
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  padding: 10px;
                  border-radius: 8px;
                  cursor: pointer;
                  transition: all 0.2s;
                ">❤️</button>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'stunning-popup'
        });

        marker.on('popupopen', () => {
          const popupElement = marker.getPopup()?.getElement();
          if (popupElement) {
            // Add safe event delegation
            popupElement.addEventListener('click', (e: Event) => {
              const target = e.target as HTMLElement;
              const button = target.closest('button[data-destination-id][data-action]') as HTMLButtonElement;
              
              if (button) {
                const destinationId = button.dataset.destinationId;
                const action = button.dataset.action;
                
                if (destinationId && action) {
                  const dest = destinations.find(d => d._id === destinationId);
                  if (dest) {
                    if (action === 'select') {
                      setSelectedDestination(dest);
                      onDestinationSelect?.(dest);
                      toast.success(`Selected: ${dest.name}`);
                    } else if (action === 'save') {
                      toast.success('❤️ Saved to wishlist!');
                    }
                  }
                }
              }
            });
          }
        });

        marker.addTo(markersLayerRef.current);
      }
    });

    // Smart map bounds
    if (sortedDestinations.length > 0) {
      const bounds = L.latLngBounds(
        sortedDestinations.map(d => {
          const [lng, lat] = d.location.coordinates;
          return [lat, lng];
        })
      );
      mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [sortedDestinations, isReady, destinations, onDestinationSelect, userLocation]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  }, [onSearch]);

  // Handle location
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('📍 Location not supported');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        mapRef.current?.setView([latitude, longitude], 15);
        toast.success('📍 Location updated!');
        setIsLoading(false);
      },
      () => {
        toast.error('📍 Unable to get location');
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const displayRouteSnackMarkers = useCallback((snacks: RouteSnackStop[]) => {
    if (!leafletRef.current || !routeSnackLayerRef.current) return;

    const L = leafletRef.current;
    routeSnackLayerRef.current.clearLayers();

    snacks.forEach((snack) => {
      const icon = L.divIcon({
        html: createFoodStopMarker(snack.type),
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([snack.lat, snack.lng], { icon, zIndexOffset: 700 })
        .bindPopup(`
          <div style="min-width: 190px; padding: 8px; font-family: system-ui;">
            <strong style="display:block; color:#111827; font-size:14px; margin-bottom:4px;">${escapeHtml(snack.name)}</strong>
            <span style="display:inline-block; color:#f97316; font-size:12px; font-weight:700; margin-bottom:6px;">${escapeHtml(getFoodStopLabel(snack.type))}</span>
            <p style="margin:0; color:#4b5563; font-size:12px;">${formatDistance(snack.distanceFromRoute)} from route</p>
          </div>
        `)
        .addTo(routeSnackLayerRef.current);
    });
  }, []);

  const calculateRouteToDestination = useCallback(async (destination: Destination) => {
    if (!userLocation || !mapRef.current || !leafletRef.current) {
      toast.error('Enable location before getting directions');
      return;
    }

    const L = leafletRef.current;
    const [lng, lat] = destination.location.coordinates;

    if (routeControlRef.current) {
      mapRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }
    routeLayerRef.current?.clearLayers();
    routeSnackLayerRef.current?.clearLayers();
    setRouteSnacks([]);
    setSnackPanelDismissed(false);

    try {
      await import('leaflet-routing-machine');

      const control = (L as any).Routing.control({
        waypoints: [
          (L as any).latLng(userLocation[0], userLocation[1]),
          (L as any).latLng(lat, lng),
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        collapsible: true,
        showAlternatives: false,
        lineOptions: {
          styles: [{ color: '#2563eb', weight: 5, opacity: 0.85 }],
        },
        createMarker: () => null,
      }).addTo(mapRef.current);

      routeControlRef.current = control;

      control.on('routesfound', async (event: any) => {
        const route = event.routes[0];
        const distanceKm = (route.summary.totalDistance / 1000).toFixed(1);
        const durationMin = Math.round(route.summary.totalTime / 60);
        const routeCoordinates: [number, number][] = (route.coordinates || []).map((coord: any) => [
          coord.lat,
          coord.lng,
        ]);

        setActiveRoute({
          destinationName: destination.name,
          distance: `${distanceKm} km`,
          duration: `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`,
        });

        try {
          const snacks = await fetchSnacksAlongRoute(routeCoordinates);
          setRouteSnacks(snacks);
          displayRouteSnackMarkers(snacks);
        } catch (error) {
          console.error('Route snack search failed:', error);
          setRouteSnacks([]);
        }
      });
    } catch (error) {
      console.error('Routing error:', error);
      toast.error('Unable to calculate directions');
    }
  }, [displayRouteSnackMarkers, userLocation]);

  const clearActiveRoute = useCallback(() => {
    if (routeControlRef.current && mapRef.current) {
      mapRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }
    routeLayerRef.current?.clearLayers();
    routeSnackLayerRef.current?.clearLayers();
    setActiveRoute(null);
    setRouteSnacks([]);
  }, []);

  const focusRouteSnack = useCallback((snack: RouteSnackStop) => {
    mapRef.current?.flyTo([snack.lat, snack.lng], 17, { duration: 0.8 });
  }, []);

  return (
    <div className="relative" style={{ height, width: '100%' }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      {/* Stunning Map Container */}
      <div
        ref={mapContainerRef}
        style={{ height: '100%', width: '100%' }}
        className="rounded-2xl overflow-hidden shadow-2xl"
      />

      {/* Enhanced Search Bar */}
      <div className="absolute top-6 left-6 right-6 z-[1000]">
        <GlassCard className="p-4 backdrop-blur-xl bg-slate-900/80 border-white/20">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search destinations, activities, or places..."
                className="w-full pl-12 pr-12 py-4 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-lg font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleGetLocation}
                disabled={isLoading}
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Navigation className="h-5 w-5" />
                )}
              </Button>
              
              <Button
                onClick={() => setShowFilters(!showFilters)}
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 font-semibold"
              >
                <Filter className="h-5 w-5" />
              </Button>
              
              <Button
                onClick={() => setShowLayers(!showLayers)}
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 font-semibold"
              >
                <Layers className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Enhanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-32 left-6 right-6 z-[1000]"
          >
            <GlassCard className="p-6 backdrop-blur-xl bg-slate-900/90 border-white/20">
              <div className="space-y-6">
                {/* Activity Types */}
                <div>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-400" />
                    Activity Types
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {activityTypes.map((activity) => {
                      const Icon = activity.icon;
                      return (
                        <button
                          key={activity.id}
                          onClick={() => setSelectedActivity(activity.id)}
                          className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                            selectedActivity === activity.id
                              ? 'bg-gradient-to-br ' + activity.color + ' text-white border-transparent shadow-lg'
                              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-xs font-medium">{activity.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categorySystem).map(([key, category]) => {
                      const Icon = category.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
                          className={`px-4 py-2 rounded-full border transition-all duration-200 flex items-center gap-2 ${
                            selectedCategory === key
                              ? 'bg-gradient-to-r ' + category.color + ' text-white border-transparent'
                              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{key}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Layers Panel */}
      <AnimatePresence>
        {showLayers && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-32 right-6 z-[1000]"
          >
            <GlassCard className="p-4 backdrop-blur-xl bg-slate-900/90 border-white/20">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-400" />
                Map Style
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'standard', name: 'Standard', icon: Map },
                  { id: 'satellite', name: 'Satellite', icon: Camera },
                  { id: 'terrain', name: 'Terrain', icon: Mountain }
                ].map((style) => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setMapStyle(style.id as typeof mapStyle)}
                      className={`w-full p-3 rounded-lg border transition-all duration-200 flex items-center gap-3 ${
                        mapStyle === style.id
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{style.name}</span>
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stunning Stats Panel */}
      <div className="absolute top-6 right-6 z-[1000]">
        <GlassCard className="px-4 py-3 backdrop-blur-xl bg-slate-900/80 border-white/20">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{sortedDestinations.length}</div>
              <div className="text-xs text-slate-400">Places</div>
            </div>
            {userLocation && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {sortedDestinations.filter(d => haversineDistance(userLocation[0], userLocation[1], d.location.coordinates[1], d.location.coordinates[0]) <= 10).length}
                </div>
                <div className="text-xs text-slate-400">Nearby</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {sortedDestinations.reduce((acc, d) => acc + (d.rating || 0), 0) / (sortedDestinations.length || 1)}
              </div>
              <div className="text-xs text-slate-400">Avg Rating</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Selected Destination Card */}
      <AnimatePresence>
        {selectedDestination && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-6 right-6 z-[1000]"
          >
            <GlassCard className="p-6 backdrop-blur-xl bg-slate-900/90 border-white/20">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{selectedDestination.name}</h3>
                  <p className="text-slate-300 mb-3">{selectedDestination.location.address}</p>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${categorySystem[selectedDestination.category as keyof typeof categorySystem]?.color} text-white`}>
                      {selectedDestination.category}
                    </span>
                    <span className="text-sm text-slate-300">Rating {selectedDestination.rating}</span>
                    {userLocation && (
                      <span className="text-sm text-emerald-400">
                        {formatDistance(haversineDistance(userLocation[0], userLocation[1], selectedDestination.location.coordinates[1], selectedDestination.location.coordinates[0]))}
                      </span>
                    )}
                  </div>
                  {activeRoute && activeRoute.destinationName === selectedDestination.name && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                      <span className="text-blue-300">{activeRoute.distance}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-blue-300">{activeRoute.duration}</span>
                      <button
                        type="button"
                        onClick={clearActiveRoute}
                        className="text-slate-400 transition-colors hover:text-white"
                      >
                        Clear route
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedDestination(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex gap-3">
                <Button size="lg" className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg">
                  <Heart className="h-4 w-4 mr-2" />
                  Save to Wishlist
                </Button>
                <Button size="lg" variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10 font-semibold">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10 font-semibold"
                  onClick={() => {
                    if (selectedDestination) {
                      calculateRouteToDestination(selectedDestination);
                    }
                  }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route Food Stops */}
      <AnimatePresence>
        {routeSnacks.length > 0 && !snackPanelDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={`absolute left-6 right-6 z-[1000] ${selectedDestination ? 'bottom-48' : 'bottom-6'}`}
          >
            <GlassCard className="border-white/20 bg-slate-950/90 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-orange-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Food stops on your route</p>
                    <p className="text-xs text-slate-400">{routeSnacks.length} found near the route corridor</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSnackPanelDismissed(true)}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss food stops"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {routeSnacks.map((snack) => (
                  <button
                    key={`${snack.type}-${snack.id}`}
                    type="button"
                    onClick={() => focusRouteSnack(snack)}
                    className="min-w-[170px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition-colors hover:border-orange-300/50 hover:bg-orange-500/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                        {getFoodStopInitials(snack.type)}
                      </span>
                      <span className="truncate text-sm font-semibold text-white">{snack.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 pl-9 text-xs text-slate-400">
                      <span>{getFoodStopLabel(snack.type)}</span>
                      <span>|</span>
                      <span>{formatDistance(snack.distanceFromRoute)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes markerDrop {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.8);
          }
          50% {
            transform: translateY(5px) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .stunning-marker:hover {
          transform: scale(1.1);
          transition: transform 0.2s ease;
        }

        :global(.leaflet-routing-container) {
          display: none !important;
        }

        @keyframes routeFoodIn {
          from {
            opacity: 0;
            transform: scale(0.72);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .stunning-popup .leaflet-popup-content-wrapper {
          background: transparent;
          border: none;
          border-radius: 16px;
          padding: 0;
          box-shadow: none;
        }

        .stunning-popup .leaflet-popup-content {
          margin: 0;
        }

        .stunning-popup .leaflet-popup-tip {
          display: none;
        }
      `}</style>
    </div>
  );
}

const StunningMap = dynamic(() => Promise.resolve(StunningMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px]">
      <div className="text-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-20 h-20 border-4 border-cyan-500/20 border-b-cyan-500 rounded-full animate-spin animation-delay-150"></div>
        </div>
        <p className="mt-6 text-lg text-slate-300 font-medium">Loading stunning map...</p>
        <p className="text-sm text-slate-500 mt-2">Preparing your adventure</p>
      </div>
    </div>
  ),
});

export default function StunningExploreMap(props: StunningMapProps) {
  return <StunningMap {...props} />;
}
