import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface MapProps {
  donations?: Array<{
    id: string;
    title: string;
    pickup_location: string;
    status: string;
  }>;
  onLocationSelect?: (location: string) => void;
  editable?: boolean;
}

const Map = ({ donations, onLocationSelect, editable = false }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [tokenLoaded, setTokenLoaded] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      const { data } = await supabase.functions.invoke('get-mapbox-token');
      if (data?.token) {
        setMapboxToken(data.token);
        setTokenLoaded(true);
      }
    };
    loadToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [78.9629, 20.5937], // Center of India
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    if (editable) {
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        const locationString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (onLocationSelect) {
          onLocationSelect(locationString);
        }
        
        // Add marker
        new mapboxgl.Marker()
          .setLngLat([lng, lat])
          .addTo(map.current!);
      });
    }

    // Add markers for donations
    if (donations) {
      donations.forEach((donation) => {
        // Simple geocoding - in production you'd want to use proper geocoding
        const coords = donation.pickup_location.split(',').map(c => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<h3 class="font-semibold">${donation.title}</h3>
             <p class="text-sm">Status: ${donation.status}</p>`
          );

          new mapboxgl.Marker({ color: donation.status === 'available' ? '#22c55e' : '#gray' })
            .setLngLat([coords[1], coords[0]])
            .setPopup(popup)
            .addTo(map.current!);
        }
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, donations, editable, onLocationSelect]);

  if (!tokenLoaded) {
    return (
      <div className="w-full h-[400px] rounded-lg bg-muted flex flex-col items-center justify-center p-4">
        <Label htmlFor="mapbox-token" className="mb-2">Enter your Mapbox Public Token:</Label>
        <Input
          id="mapbox-token"
          type="text"
          placeholder="pk.eyJ1..."
          value={mapboxToken}
          onChange={(e) => setMapboxToken(e.target.value)}
          className="max-w-md mb-2"
        />
        <p className="text-sm text-muted-foreground text-center">
          Get your token from <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">mapbox.com</a>
        </p>
        <button 
          onClick={() => setTokenLoaded(true)}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Load Map
        </button>
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
