'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { haversineDistance, formatDistance } from '@/lib/distanceUtils';
import { escapeHtml } from '@/lib/htmlUtils';
import { fetchNearbyAmenities, fetchSnacksAlongRoute, Amenity, RouteSnackStop } from '@/lib/overpassService';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Loader2, Coffee, X, MapPin, Navigation, Route, Flag } from 'lucide-react';
import { toast } from 'sonner';

const categoryIcons: { [key: string]: string } = {
  Religious: '🛕',
  Nature: '🌊',
  Adventure: '🏔️',
  Cultural: '🎭',
  Urban: '🏙️',
};

const amenityLabels: Record<string, string> = {
  cafe: 'Cafe',
  fast_food: 'Quick Bite',
  restaurant: 'Restaurant',
};

const amenityShortLabels: Record<string, string> = {
  cafe: 'CF',
  fast_food: 'QB',
  restaurant: 'RS',
};

interface Destination {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  shortDescription?: string;
  rating?: number;
}

interface RouteStop {
  destination: Destination;
  distance: number;
  isOnRoute: boolean;
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    title: string;
    description?: string;
    category?: string;
    id?: string;
    onClick?: () => void;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
  enableClickToSelect?: boolean;
  destinations?: Destination[];
  // NEW: Route to destination when selected
  routeToDestination?: Destination | null;
  // NEW: Callback when route is calculated
  onRouteCalculated?: (route: { distance: number; duration: number; stops: RouteStop[]; snacks: RouteSnackStop[] }) => void;
  snackFinderEnabled?: boolean;
  snackFinderAutoSearch?: boolean;
  snackSearchRadius?: number;
}

interface NearbyRecommendation {
  destination: Destination;
  distance: number;
}

type AmenityWithDistance = Amenity & { distance?: number };

// Category colors and styles for markers
const categoryColors: { [key: string]: { bg: string; border: string; text: string } } = {
  Religious: { bg: '#f59e0b', border: '#d97706', text: '#fff' },
  Nature: { bg: '#06b6d4', border: '#0891b2', text: '#fff' },
  Adventure: { bg: '#10b981', border: '#059669', text: '#fff' },
  Cultural: { bg: '#8b5cf6', border: '#7c3aed', text: '#fff' },
  Urban: { bg: '#3b82f6', border: '#2563eb', text: '#fff' },
};

// Create styled marker HTML with proper pin shape and label
function createMarkerHtml(category: string, label: string, isSelected: boolean = false): string {
  const colors = categoryColors[category] || { bg: '#64748b', border: '#475569', text: '#fff' };
  const displayLabel = label.length > 12 ? label.slice(0, 12) + '...' : label;
  const scale = isSelected ? 1.2 : 1;
  
  return `
    <div style="
      transform: scale(${scale});
      transition: transform 0.2s;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
    ">
      <!-- Pin shape -->
      <div style="
        position: relative;
        width: 40px;
        height: 50px;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <!-- Pin head -->
        <div style="
          width: 36px;
          height: 36px;
          background: ${colors.bg};
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        ">
          <span style="
            font-size: 14px;
            font-weight: 600;
            color: ${colors.text};
          ">${category.charAt(0)}</span>
        </div>
        <!-- Pin pointer -->
        <div style="
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 14px solid ${colors.bg};
          margin-top: -4px;
          z-index: 1;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
        "></div>
      </div>
      <!-- Label below pin -->
      <div style="
        position: absolute;
        top: 52px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 3;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${displayLabel}</div>
    </div>
  `;
}

// Create user location marker
function createUserMarkerHtml(): string {
  return `
    <div style="position: relative; width: 24px; height: 24px;">
      <!-- Pulse ring -->
      <div style="
        position: absolute;
        width: 40px;
        height: 40px;
        background: rgba(59, 130, 246, 0.3);
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: pulse 2s infinite;
      "></div>
      <!-- Center dot -->
      <div style="
        position: absolute;
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        z-index: 2;
      "></div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.2; }
        }
      </style>
    </div>
  `;
}

function createAmenityMarkerHtml(type: string, variant: 'nearby' | 'route' = 'nearby'): string {
  const label = amenityShortLabels[type] || 'FD';
  const isRoute = variant === 'route';
  const bg = isRoute ? '#f97316' : '#16a34a';
  const border = isRoute ? '#fed7aa' : '#bbf7d0';

  return `
    <div style="
      width: ${isRoute ? 34 : 30}px;
      height: ${isRoute ? 34 : 30}px;
      border-radius: 999px;
      background: ${bg};
      border: 2px solid ${border};
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.28);
      animation: snackMarkerIn 220ms ease-out both;
    ">${label}</div>
  `;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function MapInner({
  center = [27.7172, 85.324],
  zoom = 14,
  markers = [],
  onMapClick,
  height = '500px',
  enableClickToSelect = false,
  destinations = [],
  routeToDestination,
  onRouteCalculated,
  snackFinderEnabled = false,
  snackFinderAutoSearch = false,
  snackSearchRadius = 3000,
}: MapProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<any>(null);
  const userLocationLayerRef = useRef<any>(null);
  const amenitiesLayerRef = useRef<any>(null);
  const routeSnackLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const routeControlRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const autoSnackSearchRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const [amenities, setAmenities] = useState<AmenityWithDistance[]>([]);
  const [routeSnacks, setRouteSnacks] = useState<RouteSnackStop[]>([]);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(false);
  const [activeRoute, setActiveRoute] = useState<{to: string; distance: string; duration?: string} | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);

  const [nearbyRecommendation, setNearbyRecommendation] = useState<NearbyRecommendation | null>(null);
  const [showRecommendationCard, setShowRecommendationCard] = useState(false);

  // Debounce markers to prevent excessive re-renders
  const debouncedMarkers = useDebounce(markers, 300);

  // Memoize nearby check to avoid recalculation
  const nearbyDestinations = useMemo(() => {
    if (!userLocation || !destinations.length) return [];
    return destinations
      .map(d => ({...d, distance: haversineDistance(userLocation[0], userLocation[1], d.lat, d.lng)}))
      .filter(d => d.distance <= 50)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 1);
  }, [userLocation, destinations]);

  // Initialize map once
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    const initMap = async (initialCenter: [number, number]) => {
      const L = (await import('leaflet')).default;
      if (!isMounted) return;

      leafletRef.current = L;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current) return;

      mapRef.current = L.map(mapContainerRef.current!, {
        center: initialCenter,
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: false, // Disable scroll zoom to prevent wild zooming
        preferCanvas: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        updateWhenIdle: true,
        keepBuffer: 2,
      }).addTo(mapRef.current);

      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
      userLocationLayerRef.current = L.layerGroup().addTo(mapRef.current);
      amenitiesLayerRef.current = L.layerGroup().addTo(mapRef.current);
      routeSnackLayerRef.current = L.layerGroup().addTo(mapRef.current);
      routeLayerRef.current = L.layerGroup().addTo(mapRef.current);

      if (enableClickToSelect && onMapClick) {
        mapRef.current.on('click', (e: any) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      setIsReady(true);
      // Force Leaflet to recalculate tile layout after flex/grid rendering
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    };

    // Try to get user location immediately, fall back to default if not available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userCenter: [number, number] = [latitude, longitude];
          setUserLocation(userCenter);
          initMap(userCenter);
          // Update marker after map is ready
          setTimeout(() => {
            if (leafletRef.current) {
              updateUserLocationMarker(latitude, longitude);
            }
          }, 100);
        },
        () => {
          initMap(center);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      initMap(center);
    }

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsReady(false);
      }
    };
  }, []);

  // NEW: Handle routeToDestination changes
  useEffect(() => {
    if (!routeToDestination || !userLocation || !mapRef.current) return;
    
    calculateRoute(routeToDestination);
  }, [routeToDestination, userLocation]);

  // Check if a point is near a route line (within buffer km)
  function isPointNearRoute(
    point: [number, number],
    routeCoordinates: [number, number][],
    bufferKm: number = 5
  ): boolean {
    for (const coord of routeCoordinates) {
      const dist = haversineDistance(point[0], point[1], coord[0], coord[1]);
      if (dist <= bufferKm) return true;
    }
    return false;
  }

  // Calculate and display route to destination
  const calculateRoute = useCallback(async (destination: Destination) => {
    if (!userLocation || !mapRef.current || !leafletRef.current) return;

    const [userLat, userLng] = userLocation;
    const L = leafletRef.current;

    // Clear existing route
    if (routeControlRef.current) {
      mapRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }
    routeLayerRef.current?.clearLayers();
    routeSnackLayerRef.current?.clearLayers();
    setRouteSnacks([]);

    try {
      // Import routing machine
      await import('leaflet-routing-machine');
      
      const control = (L as any).Routing.control({
        waypoints: [
          (L as any).latLng(userLat, userLng),
          (L as any).latLng(destination.lat, destination.lng),
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        collapsible: true,
        showAlternatives: false,
        lineOptions: {
          styles: [{ color: '#3b82f6', weight: 5, opacity: 0.8, dashArray: '10, 10' }],
        },
        createMarker: () => null, // We'll create our own markers
      }).addTo(mapRef.current);

      routeControlRef.current = control;

      control.on('routesfound', async (e: any) => {
        const route = e.routes[0];
        const distanceKm = (route.summary.totalDistance / 1000).toFixed(1);
        const durationMin = Math.round(route.summary.totalTime / 60);
        const routeCoordinates: [number, number][] = (route.coordinates || []).map((coord: any) => [
          coord.lat,
          coord.lng,
        ]);
        
        setActiveRoute({ 
          to: destination.name, 
          distance: `${distanceKm} km`,
          duration: `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
        });

        // Find attractions along the route
        let stops: RouteStop[] = [];

        if (destinations.length > 0 && routeCoordinates.length > 0) {
          stops = destinations
            .filter(d => d._id !== destination._id)
            .map(d => {
              const dist = haversineDistance(userLat, userLng, d.lat, d.lng);
              const isOnRoute = isPointNearRoute([d.lat, d.lng], routeCoordinates, 8);
              return { destination: d, distance: dist, isOnRoute };
            })
            .filter(s => s.isOnRoute && s.distance <= 50)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);
          
          setRouteStops(stops);
          
          // Display route stops on map
          displayRouteStops(stops);
        }

        try {
          const snacks = routeCoordinates.length > 0
            ? await fetchSnacksAlongRoute(routeCoordinates)
            : [];

          setRouteSnacks(snacks);
          displayRouteSnackMarkers(snacks);

          onRouteCalculated?.({
            distance: route.summary.totalDistance,
            duration: route.summary.totalTime,
            stops,
            snacks,
          });
        } catch (error) {
          console.error('Route snacks error:', error);
          onRouteCalculated?.({
            distance: route.summary.totalDistance,
            duration: route.summary.totalTime,
            stops,
            snacks: [],
          });
        }

        // Center map on route
        const bounds = (L as any).latLngBounds([
          [userLat, userLng],
          [destination.lat, destination.lng]
        ]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      });

    } catch (error) {
      console.error('Routing error:', error);
      toast.error('Failed to calculate route. Please try again.');
    }
  }, [userLocation, destinations, onRouteCalculated]);

  // Display route stops on map
  const displayRouteStops = useCallback((stops: RouteStop[]) => {
    if (!isReady || !routeLayerRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    
    stops.forEach((stop) => {
      const stopIcon = L.divIcon({
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: #10b981;
            border: 2px solid #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            font-size: 12px;
            font-weight: 600;
            color: #fff;
          ">${stop.destination.category?.charAt(0) || '•'}</div>
        `,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([stop.destination.lat, stop.destination.lng], { icon: stopIcon })
        .bindPopup(`
          <div style="min-width: 150px;">
            <strong>${escapeHtml(stop.destination.name)}</strong>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              ${formatDistance(stop.distance)} detour
            </p>
            ${stop.destination.category ? `<span style="font-size: 11px; color: #10b981;">${escapeHtml(stop.destination.category)}</span>` : ''}
          </div>
        `)
        .addTo(routeLayerRef.current);
    });
  }, [isReady]);

  const displayRouteSnackMarkers = useCallback((snacks: RouteSnackStop[]) => {
    if (!isReady || !routeSnackLayerRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    routeSnackLayerRef.current.clearLayers();

    snacks.forEach((snack) => {
      const snackIcon = L.divIcon({
        html: createAmenityMarkerHtml(snack.type, 'route'),
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([snack.lat, snack.lng], { icon: snackIcon, zIndexOffset: 700 })
        .bindPopup(`
          <div style="min-width: 180px; padding: 6px;">
            <strong style="color:#111827;">${escapeHtml(snack.name)}</strong>
            <p style="margin: 4px 0; font-size: 12px; color: #4b5563;">
              ${escapeHtml(amenityLabels[snack.type] || 'Food stop')}
            </p>
            <p style="margin: 0; font-size: 12px; color: #f97316;">
              ${formatDistance(snack.distanceFromRoute)} from route
            </p>
          </div>
        `)
        .addTo(routeSnackLayerRef.current);
    });
  }, [isReady]);

  const clearRoute = useCallback(() => {
    if (routeControlRef.current && mapRef.current) {
      mapRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }
    routeLayerRef.current?.clearLayers();
    routeSnackLayerRef.current?.clearLayers();
    setActiveRoute(null);
    setRouteStops([]);
    setRouteSnacks([]);
  }, []);

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        
        // Always update marker and center map when button is clicked
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 17); // Zoom in very close
        }
        
        // Use timeout to ensure leaflet is ready
        setTimeout(() => {
          updateUserLocationMarker(latitude, longitude);
        }, 50);
        
        setIsTracking(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Unable to get your location. Please check location permissions.');
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const updateUserLocationMarker = useCallback((lat: number, lng: number) => {
    if (!isReady || !userLocationLayerRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    userLocationLayerRef.current.clearLayers();

    const userIcon = L.divIcon({
      html: createUserMarkerHtml(),
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
      .bindPopup('<strong>You are here</strong>')
      .addTo(userLocationLayerRef.current);

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 16); // Zoom in closer when location found
    }
  }, [isReady]);

  const handleFindSnacks = useCallback(async () => {
    if (!snackFinderEnabled) return;

    if (!userLocation) {
      toast.error('Please enable location first');
      return;
    }

    const [lat, lng] = userLocation;
    setIsLoadingAmenities(true);

    try {
      const results = await fetchNearbyAmenities(lat, lng, snackSearchRadius);
      // Limit to 10 closest amenities
      const limited: AmenityWithDistance[] = results
        .map(a => ({...a, distance: haversineDistance(lat, lng, a.lat, a.lon)}))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);

      setAmenities(limited);
      displayAmenityMarkers(limited);
    } catch (error) {
      console.error('Amenities error:', error);
    } finally {
      setIsLoadingAmenities(false);
    }
  }, [snackFinderEnabled, snackSearchRadius, userLocation]);

  useEffect(() => {
    if (!snackFinderEnabled || !snackFinderAutoSearch || !userLocation || autoSnackSearchRef.current) {
      return;
    }

    autoSnackSearchRef.current = true;
    handleFindSnacks();
  }, [handleFindSnacks, snackFinderAutoSearch, snackFinderEnabled, userLocation]);

  // Extended amenity type with distance
  const displayAmenityMarkers = useCallback((amenityList: AmenityWithDistance[]) => {
    if (!isReady || !amenitiesLayerRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    amenitiesLayerRef.current.clearLayers();

    const escapeHtml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    amenityList.forEach((amenity) => {
      const amenityIcon = L.divIcon({
        html: createAmenityMarkerHtml(amenity.type),
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const popupContent = `
        <div style="min-width:200px;padding:8px;">
          <strong style="color:#16a34a;">${escapeHtml(amenity.name)}</strong>
          <p style="margin:4px 0;font-size:12px;color:#666;">
            ${amenity.distance ? escapeHtml(formatDistance(amenity.distance)) : ''} away
          </p>
          <p style="margin:0;font-size:12px;color:#666;">${escapeHtml(amenityLabels[amenity.type] || 'Food stop')}</p>
          <button
            style="margin-top:8px;padding:6px 12px;background:#16a34a;color:white;border:none;border-radius:4px;cursor:pointer;"
          >
            Get Directions
          </button>
        </div>
      `;

      const marker = L.marker([amenity.lat, amenity.lon], { icon: amenityIcon });
      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const container = marker.getPopup()?.getElement();
        const btn = container?.querySelector('button');
        if (btn) {
          btn.addEventListener('click', () => {
            getDirections(amenity.lat, amenity.lon, amenity.name);
          }, { once: true });
        }
      });
      marker.addTo(amenitiesLayerRef.current);
    });
  }, [isReady]);

  const getDirections = useCallback(async (destLat: number, destLng: number, destName?: string) => {
    if (!userLocation || !mapRef.current) return;

    const [userLat, userLng] = userLocation;

    if (routeControlRef.current) {
      mapRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }

    try {
      await import('leaflet-routing-machine');
      const L = leafletRef.current;

      const control = (L as any).Routing.control({
        waypoints: [
          (L as any).latLng(userLat, userLng),
          (L as any).latLng(destLat, destLng),
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        collapsible: true,
        showAlternatives: false,
        lineOptions: {
          styles: [{ color: '#3b82f6', weight: 4, opacity: 0.8 }],
        },
        createMarker: () => null,
      }).addTo(mapRef.current);

      routeControlRef.current = control;

      control.on('routesfound', (e: any) => {
        const route = e.routes[0];
        const distance = (route.summary.totalDistance / 1000).toFixed(1);
        setActiveRoute({ to: destName || 'Destination', distance: `${distance} km` });
      });
    } catch (error) {
      console.error('Routing error:', error);
    }
  }, [userLocation]);

  useEffect(() => {
    (window as any).getDirections = getDirections;
    return () => {
      delete (window as any).getDirections;
    };
  }, [getDirections]);

  // Auto-request location on mount for better UX
  useEffect(() => {
    if (isReady && !userLocation) {
      // Small delay to let map render first
      const timer = setTimeout(() => {
        getUserLocation();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isReady, getUserLocation, userLocation]);

  // Update markers with RAF for smooth performance
  useEffect(() => {
    if (!isReady || !markersLayerRef.current || !leafletRef.current) return;

    const updateMarkers = () => {
      const L = leafletRef.current;
      markersLayerRef.current.clearLayers();

      debouncedMarkers.forEach((marker) => {
        const isSelected = activeRoute?.to === marker.title;
        
        const customIcon = L.divIcon({
          html: createMarkerHtml(marker.category || '', marker.title, isSelected),
          className: 'custom-marker-icon',
          iconSize: [100, 80],
          iconAnchor: [50, 40],
          popupAnchor: [0, -40],
        });

        const popupContent = `
          <div style="min-width:200px;padding:8px;">
            <strong style="font-size:14px;">${escapeHtml(marker.title)}</strong>
            ${marker.description ? `<p style="margin:4px 0 0;font-size:12px;color:#666;">${escapeHtml(marker.description)}</p>` : ''}
            ${marker.category ? `<span style="display:inline-block;margin-top:4px;padding:2px 8px;background:#f0f0f0;border-radius:12px;font-size:11px;">${escapeHtml(marker.category)}</span>` : ''}
            ${marker.id ? `<br/><a href="/places/${escapeHtml(marker.id)}" style="display:inline-block;margin-top:6px;color:#0066cc;font-size:12px;text-decoration:none;font-weight:600;">View Details &rarr;</a>` : ''}
          </div>
        `;

        const leafletMarker = L.marker(marker.position, { icon: customIcon })
          .bindPopup(popupContent);

        if (marker.onClick) {
          leafletMarker.on('click', marker.onClick);
        }

        leafletMarker.addTo(markersLayerRef.current);
      });
    };

    const rafId = requestAnimationFrame(updateMarkers);
    return () => cancelAnimationFrame(rafId);
  }, [debouncedMarkers, isReady]);

  return (
    <div className="relative" style={{ height, width: '100%' }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style jsx global>{`
        .leaflet-routing-container {
          display: none !important;
        }
        @keyframes snackMarkerIn {
          from { opacity: 0; transform: scale(0.72); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div
        ref={mapContainerRef}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        className="z-0 relative border border-border shadow-sm"
      />

      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        {snackFinderEnabled ? (
          <Button
            onClick={handleFindSnacks}
            disabled={isLoadingAmenities || !userLocation}
            className="gap-2 border border-primary/20 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {isLoadingAmenities ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Coffee className="h-4 w-4" />
            )}
            Find Snacks
          </Button>
        ) : null}

        <Button
          onClick={getUserLocation}
          variant="outline"
          className="border-border bg-card/95 text-foreground shadow-sm backdrop-blur hover:bg-muted"
          size="sm"
          disabled={isTracking}
        >
          {isTracking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>

        {activeRoute && (
          <Button
            onClick={clearRoute}
            variant="destructive"
            size="sm"
            className="shadow-lg"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Route
          </Button>
        )}
      </div>

      {/* Route Info Card */}
      {activeRoute && (
        <div className="absolute top-4 left-4 z-[400] max-w-sm">
          <GlassCard className="shadow-xl p-4 border-blue-500/30">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Route className="h-4 w-4 text-blue-400" />
                  <p className="text-sm font-semibold text-blue-300">
                    Route to {activeRoute.to}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="flex items-center gap-1">
                    <Navigation className="h-3 w-3 text-emerald-400" />
                    {activeRoute.distance}
                  </span>
                  {activeRoute.duration && (
                    <span className="flex items-center gap-1">
                      <Flag className="h-3 w-3 text-amber-400" />
                      ~{activeRoute.duration}
                    </span>
                  )}
                </div>
                {routeStops.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/10">
                    <p className="text-xs text-slate-400 mb-1">
                      {routeStops.length} stop{routeStops.length > 1 ? 's' : ''} along route:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {routeStops.slice(0, 3).map((stop) => (
                        <span 
                          key={stop.destination._id}
                          className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300"
                        >
                          {stop.destination.name}
                        </span>
                      ))}
                      {routeStops.length > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                          +{routeStops.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {routeSnacks.length > 0 && (
                  <p className="mt-2 text-xs text-orange-300">
                    {routeSnacks.length} food stop{routeSnacks.length > 1 ? 's' : ''} found along this route
                  </p>
                )}
              </div>
              <button
                onClick={clearRoute}
                className="text-slate-400 hover:text-slate-200 ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </GlassCard>
        </div>
      )}
      {/* Location Status */}
      <div className="absolute bottom-4 left-4 z-[400]">
        <GlassCard className="p-2">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {userLocation ? (
              <>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Location found</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                <span>Use location button</span>
              </>
            )}
          </div>
        </GlassCard>
      </div>

      {showRecommendationCard && nearbyRecommendation && (
        <div className="absolute top-4 left-4 z-[400] max-w-sm">
          <GlassCard className="shadow-xl p-4 border-amber-500/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-300 mb-1">
                  You are near {nearbyRecommendation.destination.name}!
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  {formatDistance(nearbyRecommendation.distance)} away
                </p>
                {snackFinderEnabled ? (
                  <Button
                    onClick={handleFindSnacks}
                    disabled={isLoadingAmenities}
                    size="sm"
                    className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isLoadingAmenities ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Coffee className="h-3 w-3" />
                    )}
                    Find Snacks
                  </Button>
                ) : null}
              </div>
              <button
                onClick={() => setShowRecommendationCard(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Amenities List - Show all 10 with distance */}
      {amenities.length > 0 && (
        <div className="absolute inset-x-3 bottom-4 z-[400] mx-auto max-h-44 w-[min(44rem,calc(100%-1.5rem))] overflow-hidden rounded-lg border border-border/80 bg-card/95 text-card-foreground shadow-lg backdrop-blur md:inset-x-auto md:left-1/2 md:-translate-x-1/2">
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Nearby Snacks</p>
                <p className="text-xs text-muted-foreground">{amenities.length} places in range</p>
              </div>
              <button
                onClick={() => {
                  setAmenities([]);
                  if (amenitiesLayerRef.current) {
                    amenitiesLayerRef.current.clearLayers();
                  }
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="grid max-h-28 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {amenities.map((amenity) => (
                <div
                  key={amenity.id}
                  className="cursor-pointer rounded-md border border-transparent p-2 text-sm transition-colors hover:border-primary/20 hover:bg-primary/5"
                  onClick={() => getDirections(amenity.lat, amenity.lon, amenity.name)}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                      {amenityShortLabels[amenity.type] || 'FD'}
                    </span>
                    <span className="truncate font-medium">{amenity.name}</span>
                  </div>
                  <div className="ml-8 text-xs text-muted-foreground">
                    {amenity.distance ? formatDistance(amenity.distance) : ''} away
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MapComponent = dynamic(() => Promise.resolve(MapInner), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center glass-card rounded-xl border border-white/10" style={{ height: '500px' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto"></div>
        <p className="mt-2 text-sm text-slate-400">Loading map...</p>
      </div>
    </div>
  ),
});

export default function MapAdvanced(props: MapProps) {
  return <MapComponent {...props} />;
}

export type { Destination, RouteStop, MapProps };
