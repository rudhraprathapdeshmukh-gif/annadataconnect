import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DonationMapProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  donations: Array<{
    id: string;
    title: string;
    latitude?: number;
    longitude?: number;
    distance_km?: number;
  }>;
}

export default function DonationMap({ center, radiusKm, donations }: DonationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView([center.lat, center.lng], getZoomForRadius(radiusKm));

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // Draw radius circle
    L.circle([center.lat, center.lng], {
      radius: radiusKm * 1000,
      color: 'hsl(24, 95%, 53%)',
      fillColor: 'hsl(24, 95%, 53%)',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '6 4',
    }).addTo(map);

    // User marker
    L.circleMarker([center.lat, center.lng], {
      radius: 6,
      color: 'hsl(24, 95%, 53%)',
      fillColor: 'hsl(24, 95%, 53%)',
      fillOpacity: 1,
      weight: 2,
    }).addTo(map).bindTooltip('You', { direction: 'top', offset: [0, -8] });

    // Donation markers
    donations.forEach((d) => {
      if (d.latitude && d.longitude) {
        L.circleMarker([d.latitude, d.longitude], {
          radius: 5,
          color: 'hsl(142, 71%, 45%)',
          fillColor: 'hsl(142, 71%, 45%)',
          fillOpacity: 0.8,
          weight: 1.5,
        }).addTo(map).bindTooltip(d.title, { direction: 'top', offset: [0, -6] });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center.lat, center.lng, radiusKm, donations]);

  return (
    <div
      ref={mapRef}
      className="w-full h-48 rounded-lg border border-border overflow-hidden"
      style={{ zIndex: 0 }}
    />
  );
}

function getZoomForRadius(km: number): number {
  if (km <= 5) return 13;
  if (km <= 10) return 12;
  if (km <= 25) return 11;
  return 10;
}
