import React, { useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
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
  }>;
  onLocationSelect?: (location: string) => void;
  editable?: boolean;
}

const Map = ({ donations, onLocationSelect, editable = false }: MapProps) => {
  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 }); // Center of India

  React.useEffect(() => {
    const loadKey = async () => {
      const { data } = await supabase.functions.invoke('get-google-maps-key');
      if (data?.key) {
        setGoogleMapsKey(data.key);
        setKeyLoaded(true);
      }
    };
    loadKey();
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (editable && e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const locationString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      if (onLocationSelect) {
        onLocationSelect(locationString);
      }
    }
  }, [editable, onLocationSelect]);

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.5rem'
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
  };

  if (!keyLoaded) {
    return (
      <div className="w-full h-[400px] rounded-lg bg-muted flex flex-col items-center justify-center p-4">
        <Label htmlFor="google-maps-key" className="mb-2">Enter your Google Maps API Key:</Label>
        <Input
          id="google-maps-key"
          type="text"
          placeholder="AIza..."
          value={manualKey}
          onChange={(e) => setManualKey(e.target.value)}
          className="max-w-md mb-2"
        />
        <p className="text-sm text-muted-foreground text-center">
          Get your API key from <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a>
        </p>
        <Button 
          onClick={() => {
            setGoogleMapsKey(manualKey);
            setKeyLoaded(true);
          }}
          className="mt-4"
        >
          Load Map
        </Button>
      </div>
    );
  }

  const markers = donations?.map((donation) => {
    const coords = donation.pickup_location.split(',').map(c => parseFloat(c.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      return {
        id: donation.id,
        position: { lat: coords[0], lng: coords[1] },
        title: donation.title,
        status: donation.status
      };
    }
    return null;
  }).filter(Boolean) as Array<{ id: string; position: { lat: number; lng: number }; title: string; status: string }>;

  return (
    <LoadScript googleMapsApiKey={googleMapsKey}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={5}
        onClick={handleMapClick}
        options={mapOptions}
      >
        {markers?.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            onClick={() => setSelectedMarker(marker.id)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: marker.status === 'available' ? '#22c55e' : '#gray',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
          />
        ))}

        {selectedMarker && markers && (
          <InfoWindow
            position={markers.find(m => m.id === selectedMarker)?.position}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2">
              <h3 className="font-semibold">{markers.find(m => m.id === selectedMarker)?.title}</h3>
              <p className="text-sm">Status: {markers.find(m => m.id === selectedMarker)?.status}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default Map;
