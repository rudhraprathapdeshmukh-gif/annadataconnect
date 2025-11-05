import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

interface MapProps {
  donations?: Array<{
    id: string;
    title: string;
    pickup_location: string;
    status: string;
    latitude?: number;
    longitude?: number;
    quantity?: string;
    quantity_unit?: string;
    food_type?: string;
    image_url?: string | null;
  }>;
  onLocationSelect?: (location: string) => void;
  editable?: boolean;
}

const Map = ({ donations, onLocationSelect, editable = false }: MapProps) => {
  const [maptilerKey, setMaptilerKey] = useState('');
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const popup = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    const loadKey = async () => {
      const { data } = await supabase.functions.invoke('get-maptiler-key');
      if (data?.key) {
        setMaptilerKey(data.key);
        setKeyLoaded(true);
      }
    };
    loadKey();
  }, []);

  useEffect(() => {
    if (!keyLoaded || !maptilerKey || !mapContainer.current || map.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`,
      center: [78.9629, 20.5937], // Center of India [lng, lat]
      zoom: 4
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    if (editable) {
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        const locationString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (onLocationSelect) {
          onLocationSelect(locationString);
        }
      });
    }

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [keyLoaded, maptilerKey, editable, onLocationSelect]);

  useEffect(() => {
    if (!map.current || !donations) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add new markers
    donations.forEach((donation) => {
      if (!donation.latitude || !donation.longitude) return;

      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = donation.status === 'available' ? '#22c55e' : '#6b7280';
      el.style.border = '2px solid #ffffff';
      el.style.cursor = 'pointer';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([donation.longitude, donation.latitude])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        const popupContent = `
          <div style="min-width: 250px; max-width: 300px;">
            ${donation.image_url ? `<img src="${donation.image_url}" alt="${donation.title}" style="width: 100%; height: 128px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : ''}
            <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">${donation.title}</h3>
            ${donation.food_type ? `<p style="font-size: 14px; color: #4b5563; margin-bottom: 4px;"><span style="font-weight: 500;">Type:</span> ${donation.food_type}</p>` : ''}
            ${donation.quantity && donation.quantity_unit ? `<p style="font-size: 14px; color: #4b5563; margin-bottom: 4px;"><span style="font-weight: 500;">Quantity:</span> ${donation.quantity} ${donation.quantity_unit}</p>` : ''}
            <p style="font-size: 14px; color: #4b5563; margin-bottom: 4px;"><span style="font-weight: 500;">Location:</span> ${donation.pickup_location}</p>
            <p style="font-size: 14px; font-weight: 500; color: ${donation.status === 'available' ? '#16a34a' : '#6b7280'};">Status: ${donation.status}</p>
          </div>
        `;

        if (popup.current) {
          popup.current.remove();
        }

        popup.current = new maplibregl.Popup({ offset: 25 })
          .setLngLat([donation.longitude, donation.latitude])
          .setHTML(popupContent)
          .addTo(map.current!);
      });

      markers.current.push(marker);
    });
  }, [donations]);

  if (!keyLoaded) {
    return (
      <div className="w-full h-[400px] rounded-lg bg-muted flex flex-col items-center justify-center p-4">
        <Label htmlFor="maptiler-key" className="mb-2">Enter your MapTiler API Key:</Label>
        <Input
          id="maptiler-key"
          type="text"
          placeholder="Your MapTiler key..."
          value={manualKey}
          onChange={(e) => setManualKey(e.target.value)}
          className="max-w-md mb-2"
        />
        <p className="text-sm text-muted-foreground text-center">
          Get your API key from <a href="https://cloud.maptiler.com/account/keys/" target="_blank" rel="noopener noreferrer" className="text-primary underline">MapTiler Cloud</a>
        </p>
        <Button 
          onClick={() => {
            setMaptilerKey(manualKey);
            setKeyLoaded(true);
          }}
          className="mt-4"
        >
          Load Map
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg shadow-lg" />
    </div>
  );
};

export default Map;
