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

    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured. Please add GOOGLE_MAPS_API_KEY to backend secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Geocoding address:', address);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      console.error('Google Maps API request failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to connect to geocoding service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = await response.json();
    console.log('Google Maps API response status:', data.status);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log('Successfully geocoded to:', location);
      return new Response(
        JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          formatted_address: data.results[0].formatted_address
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (data.status === 'ZERO_RESULTS') {
      console.error('No results found for address:', address);
      return new Response(
        JSON.stringify({ error: 'Address not found. Please check the address and try again.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('Google Maps API request denied:', data.error_message);
      return new Response(
        JSON.stringify({ error: 'Google Maps API key is invalid or restricted. Please check your API key configuration.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('Google Maps API quota exceeded');
      return new Response(
        JSON.stringify({ error: 'Geocoding service quota exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Geocoding failed with status:', data.status, 'Message:', data.error_message);
      return new Response(
        JSON.stringify({ error: `Geocoding failed: ${data.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
