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
  onDonationClick?: (id: string) => void;
}

export default function DonationMap({ center, radiusKm, donations, onDonationClick }: DonationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
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

    // Collect bounds
    const boundsPoints: L.LatLngExpression[] = [[center.lat, center.lng]];

    // User marker
    L.circleMarker([center.lat, center.lng], {
      radius: 6,
      color: 'hsl(24, 95%, 53%)',
      fillColor: 'hsl(24, 95%, 53%)',
      fillOpacity: 1,
      weight: 2,
    }).addTo(map).bindTooltip('You', { direction: 'top', offset: [0, -8] });

    // Donation markers with popups
    donations.forEach((d) => {
      if (d.latitude && d.longitude) {
        boundsPoints.push([d.latitude, d.longitude]);

        const distanceText = d.distance_km != null
          ? `<br/><span style="color:#666;font-size:12px">${d.distance_km.toFixed(1)} km away</span>`
          : '';
        const viewLink = onDonationClick
          ? `<br/><a href="#" class="donation-view-link" data-id="${d.id}" style="color:hsl(24,95%,53%);font-size:12px;font-weight:500">View →</a>`
          : '';

        const marker = L.circleMarker([d.latitude, d.longitude], {
          radius: 5,
          color: 'hsl(142, 71%, 45%)',
          fillColor: 'hsl(142, 71%, 45%)',
          fillOpacity: 0.8,
          weight: 1.5,
        }).addTo(map).bindPopup(
          `<strong style="font-size:13px">${d.title}</strong>${distanceText}${viewLink}`,
          { closeButton: false, className: 'donation-popup' }
        );

        if (onDonationClick) {
          marker.on('popupopen', () => {
            setTimeout(() => {
              const link = document.querySelector(`.donation-view-link[data-id="${d.id}"]`);
              if (link) {
                link.addEventListener('click', (e) => {
                  e.preventDefault();
                  onDonationClick(d.id);
                });
              }
            }, 0);
          });
        }
      }
    });

    // Fit bounds if we have donation markers
    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [30, 30], maxZoom: 15 });
    }

    mapInstanceRef.current = map;

    setTimeout(() => { map.invalidateSize(); }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center.lat, center.lng, radiusKm, donations, onDonationClick]);

  return (
    <div
      ref={mapRef}
      className="w-full h-64 rounded-lg border border-border overflow-hidden"
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
