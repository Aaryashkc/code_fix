'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { RouteSnackStop } from '@/lib/overpassService';

export interface ExploreMarker {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
}

interface UserExploreMapProps {
  markers: ExploreMarker[];
  selectedMarkerId?: string;
  userLocation?: [number, number] | null;
  userLocationStatus?: 'default' | 'sos';
  routePath?: [number, number][];
  routeSnackStops?: RouteSnackStop[];
  selectedRouteSnackKey?: string | null;
  plannedRouteSnackKeys?: string[];
  onSelectMarker?: (markerId: string) => void;
  onSelectRouteSnack?: (snackKey: string) => void;
}

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];

const CATEGORY_COLORS: Record<string, string> = {
  Adventure: '#0f766e',
  Nature: '#0369a1',
  Cultural: '#6d28d9',
  Religious: '#a16207',
  Urban: '#1d4ed8',
};

type MarkerKind = 'mountain' | 'temple' | 'nature' | 'culture' | 'city';

const CATEGORY_ICON_KIND: Record<string, MarkerKind> = {
  Adventure: 'mountain',
  Nature: 'nature',
  Cultural: 'culture',
  Religious: 'temple',
  Urban: 'city',
};

const MARKER_KEYWORD_MATCHERS: Array<{ kind: MarkerKind; pattern: RegExp }> = [
  { kind: 'temple', pattern: /\b(temple|stupa|monastery|gumba|vihara|mandir|lumbini|pashupati|boudha)\b/i },
  { kind: 'mountain', pattern: /\b(himal|himalaya|everest|annapurna|kanchenjunga|manaslu|langtang|base camp|peak|summit|trek|trail|circuit)\b/i },
  { kind: 'nature', pattern: /\b(lake|falls|waterfall|river|park|forest|jungle|reserve|wetland|safari|chitwan)\b/i },
  { kind: 'culture', pattern: /\b(durbar|museum|heritage|palace|square|plaza|cultural)\b/i },
];

function resolveMarkerKind(marker: ExploreMarker): MarkerKind {
  const searchableText = `${marker.name} ${marker.address} ${marker.category}`;

  for (const matcher of MARKER_KEYWORD_MATCHERS) {
    if (matcher.pattern.test(searchableText)) {
      return matcher.kind;
    }
  }

  return CATEGORY_ICON_KIND[marker.category] || 'city';
}

function getMarkerSvg(kind: MarkerKind, color: string): string {
  switch (kind) {
    case 'mountain':
      return `
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M3 18L9 8l3 4 2-3 7 9H3z" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"/>
          <path d="M9 8l1.6 2.2" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M14 9l1.2 1.8" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
        </svg>
      `;
    case 'temple':
      return `
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6 19h12" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M8 19v-4m4 4v-4m4 4v-4" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M5 15h14" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M7 11h10" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M9 7h6" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M12 4v3" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
        </svg>
      `;
    case 'nature':
      return `
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M12 18v-5" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M12 6c-3 0-5 2.1-5 4.7 0 2.2 1.4 3.9 3.4 4.5.7-1.8 1-3 1.6-5.2.6 2.2.9 3.4 1.6 5.2 2-.6 3.4-2.3 3.4-4.5C17 8.1 15 6 12 6z" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"/>
        </svg>
      `;
    case 'culture':
      return `
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M7 18V8l5-2 5 2v10" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"/>
          <path d="M10 18v-4h4v4" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"/>
          <path d="M5 18h14" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
        </svg>
      `;
    case 'city':
    default:
      return `
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M5 19V9l5-2v12M14 19V5l5 2v12M9 11h2m-2 3h2m7-4h2m-2 3h2" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 19h18" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
        </svg>
      `;
  }
}

function createMarkerIcon(marker: ExploreMarker, isSelected: boolean) {
  const color = CATEGORY_COLORS[marker.category] || '#0f766e';
  const iconSize = isSelected ? 54 : 48;
  const innerSize = isSelected ? 40 : 36;
  const ringInset = isSelected ? 0 : 4;
  const svg = getMarkerSvg(resolveMarkerKind(marker), '#ffffff');

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${iconSize}px;height:${iconSize + 12}px;">
        ${
          isSelected
            ? `
              <span style="
                position:absolute;
                inset:${ringInset}px ${ringInset}px 12px ${ringInset}px;
                border-radius:999px;
                border:2px solid ${color}55;
                background:${color}12;
              "></span>
            `
            : ''
        }
        <span style="
          position:absolute;
          left:50%;
          top:0;
          transform:translateX(-50%);
          width:${innerSize}px;
          height:${innerSize}px;
          border-radius:14px;
          background:${color};
          border:2px solid rgba(255,255,255,0.95);
          box-shadow:0 10px 20px rgba(15,23,42,0.28);
          display:flex;
          align-items:center;
          justify-content:center;
        "></span>
        <span style="
          position:absolute;
          left:50%;
          bottom:0;
          transform:translateX(-50%);
          width:0;
          height:0;
          border-left:10px solid transparent;
          border-right:10px solid transparent;
          border-top:14px solid ${color};
          filter:drop-shadow(0 6px 10px rgba(15,23,42,0.18));
        "></span>
        <span style="
          position:absolute;
          left:50%;
          top:${isSelected ? 10 : 8}px;
          transform:translateX(-50%);
          width:20px;
          height:20px;
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:1;
        ">${svg}</span>
      </div>
    `,
    iconSize: [iconSize, iconSize + 12],
    iconAnchor: [iconSize / 2, iconSize + 12],
  });
}

function createUserIcon(status: 'default' | 'sos') {
  const color = status === 'sos' ? '#dc2626' : '#2563eb';
  const ringColor = status === 'sos' ? 'rgba(220,38,38,0.22)' : 'rgba(37,99,235,0.24)';

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:28px;height:28px;">
        <span style="
          position:absolute;
          inset:-6px;
          border-radius:999px;
          background:${ringColor};
          animation:pulse 1.7s ease-in-out infinite;
        "></span>
        <span style="
          position:absolute;
          inset:4px;
          border-radius:999px;
          background:${color};
          border:3px solid rgba(255,255,255,0.96);
          box-shadow:0 10px 22px rgba(15,23,42,0.25);
        "></span>
        <style>
          @keyframes pulse {
            0% { transform: scale(0.9); opacity: 0.85; }
            70% { transform: scale(1.25); opacity: 0.2; }
            100% { transform: scale(1.35); opacity: 0; }
          }
        </style>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function getFoodStopLabel(type: RouteSnackStop['type']) {
  if (type === 'cafe') return 'Cafe';
  if (type === 'fast_food') return 'Quick Bite';
  return 'Restaurant';
}

function getFoodStopInitials(type: RouteSnackStop['type']) {
  if (type === 'cafe') return 'CF';
  if (type === 'fast_food') return 'QB';
  return 'RS';
}

function getRouteSnackKey(snack: RouteSnackStop) {
  return `${snack.type}-${snack.id}`;
}

function createFoodStopIcon(type: RouteSnackStop['type'], isSelected: boolean, isPlanned: boolean) {
  const size = isSelected ? 38 : 32;
  const bg = isPlanned ? '#0f766e' : '#f97316';
  const border = isSelected ? '#ffffff' : isPlanned ? '#99f6e4' : '#fed7aa';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        background:${bg};
        border:2px solid ${border};
        color:#ffffff;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:10px;
        font-weight:800;
        letter-spacing:0;
        box-shadow:0 8px 20px rgba(15,23,42,0.28);
      ">${getFoodStopInitials(type)}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitToData({
  markers,
  userLocation,
}: {
  markers: ExploreMarker[];
  userLocation?: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = markers.map((marker) => [marker.lat, marker.lng]);
    if (userLocation) points.push(userLocation);

    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, 7);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, markers, userLocation]);

  return null;
}

function FocusRouteSnack({
  snack,
}: {
  snack?: RouteSnackStop;
}) {
  const map = useMap();

  useEffect(() => {
    if (!snack) return;
    map.flyTo([snack.lat, snack.lng], Math.max(map.getZoom(), 14), { duration: 0.7 });
  }, [map, snack]);

  return null;
}

export default function UserExploreMap({
  markers,
  selectedMarkerId,
  userLocation,
  userLocationStatus = 'default',
  routePath,
  routeSnackStops = [],
  selectedRouteSnackKey,
  plannedRouteSnackKeys = [],
  onSelectMarker,
  onSelectRouteSnack,
}: UserExploreMapProps) {
  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId),
    [markers, selectedMarkerId]
  );

  const routeLine = useMemo(() => {
    if (routePath && routePath.length > 1) return routePath;
    if (!selectedMarker || !userLocation) return null;
    return [
      userLocation,
      [selectedMarker.lat, selectedMarker.lng] as [number, number],
    ];
  }, [routePath, selectedMarker, userLocation]);

  const selectedRouteSnack = useMemo(
    () => routeSnackStops.find((snack) => getRouteSnackKey(snack) === selectedRouteSnackKey),
    [routeSnackStops, selectedRouteSnackKey]
  );

  const plannedSnackKeySet = useMemo(
    () => new Set(plannedRouteSnackKeys),
    [plannedRouteSnackKeys]
  );

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={7}
        scrollWheelZoom={true}
        className="h-full w-full rounded-xl"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <FitToData markers={markers} userLocation={userLocation} />
        <FocusRouteSnack snack={selectedRouteSnack} />

        {markers.map((marker) => {
        const isSelected = marker.id === selectedMarkerId;
        return (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={createMarkerIcon(marker, isSelected)}
            eventHandlers={onSelectMarker ? {
              click: () => onSelectMarker(marker.id),
            } : undefined}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-semibold">{marker.name}</p>
                <p className="text-xs text-slate-600">{marker.address}</p>
                <p className="mt-1 text-xs">
                  {marker.category} • ⭐ {marker.rating.toFixed(1)}
                </p>
              </div>
            </Popup>
          </Marker>
        );
        })}

        {userLocation && (
          <Marker position={userLocation} icon={createUserIcon(userLocationStatus)}>
            <Popup>{userLocationStatus === 'sos' ? 'Emergency location' : 'Live traveler location'}</Popup>
          </Marker>
        )}

        {routeSnackStops.map((snack) => {
        const snackKey = getRouteSnackKey(snack);
        const isSelected = snackKey === selectedRouteSnackKey;
        const isPlanned = plannedSnackKeySet.has(snackKey);
        return (
          <Marker
            key={snackKey}
            position={[snack.lat, snack.lng]}
            icon={createFoodStopIcon(snack.type, isSelected, isPlanned)}
            zIndexOffset={isSelected ? 700 : 500}
            eventHandlers={onSelectRouteSnack ? {
              click: () => onSelectRouteSnack(snackKey),
            } : undefined}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-semibold">{snack.name}</p>
                <p className="text-xs text-slate-600">{getFoodStopLabel(snack.type)}</p>
                <p className="mt-1 text-xs text-orange-700">
                  {snack.distanceFromRoute.toFixed(1)} km from route
                </p>
                {isPlanned && (
                  <p className="mt-1 text-xs font-medium text-teal-700">Planned route pause</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
        })}

        {routeLine && (
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: routePath && routePath.length > 1 ? '#f97316' : '#2563eb',
              weight: 4,
              opacity: 0.85,
              dashArray: routePath && routePath.length > 1 ? undefined : '8 8',
            }}
          />
        )}
      </MapContainer>
    </>
  );
}
