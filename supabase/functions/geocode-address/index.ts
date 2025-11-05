import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address) {
      console.error('No address provided in request');
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAPTILER_API_KEY = Deno.env.get('MAPTILER_API_KEY');
    
    if (!MAPTILER_API_KEY) {
      console.error('MAPTILER_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'MapTiler API key not configured. Please add MAPTILER_API_KEY to backend secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Geocoding address:', address);
    const geocodeUrl = `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${MAPTILER_API_KEY}`;
    
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      console.error('MapTiler API request failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to connect to geocoding service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = await response.json();
    console.log('MapTiler API response:', data);

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      console.log('Successfully geocoded to:', { lat, lng });
      return new Response(
        JSON.stringify({
          latitude: lat,
          longitude: lng,
          formatted_address: feature.place_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('No results found for address:', address);
      return new Response(
        JSON.stringify({ error: 'Address not found. Please check the address and try again.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in geocode-address function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
