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
    latitude?: number;
    longitude?: number;
    quantity?: string;
    quantity_unit?: string;
    food_type?: string;
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
    // Use latitude and longitude if available
    if (donation.latitude && donation.longitude) {
      return {
        id: donation.id,
        position: { lat: donation.latitude, lng: donation.longitude },
        title: donation.title,
        status: donation.status,
        location: donation.pickup_location,
        quantity: donation.quantity,
        quantity_unit: donation.quantity_unit,
        food_type: donation.food_type
      };
    }
    return null;
  }).filter(Boolean) as Array<{ 
    id: string; 
    position: { lat: number; lng: number }; 
    title: string; 
    status: string;
    location: string;
    quantity?: string;
    quantity_unit?: string;
    food_type?: string;
  }>;

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

        {selectedMarker && markers && (() => {
          const marker = markers.find(m => m.id === selectedMarker);
          return marker ? (
            <InfoWindow
              position={marker.position}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-3 min-w-[200px]">
                <h3 className="font-semibold text-base mb-2">{marker.title}</h3>
                {marker.food_type && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Type:</span> {marker.food_type}
                  </p>
                )}
                {marker.quantity && marker.quantity_unit && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Quantity:</span> {marker.quantity} {marker.quantity_unit}
                  </p>
                )}
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Location:</span> {marker.location}
                </p>
                <p className={`text-sm font-medium ${marker.status === 'available' ? 'text-green-600' : 'text-gray-500'}`}>
                  Status: {marker.status}
                </p>
              </div>
            </InfoWindow>
          ) : null;
        })()}
      </GoogleMap>
    </LoadScript>
  );
};

export default Map;
