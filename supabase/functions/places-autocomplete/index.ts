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
    const { input } = await req.json();
    
    if (!input) {
      return new Response(
        JSON.stringify({ error: 'Input is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAPTILER_API_KEY = Deno.env.get('MAPTILER_API_KEY');
    
    if (!MAPTILER_API_KEY) {
      console.error('MAPTILER_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Fetching autocomplete suggestions for:', input);
    
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(input)}.json?key=${MAPTILER_API_KEY}&autocomplete=true&limit=5`;
    const response = await fetch(url);
    const data = await response.json();

    console.log('MapTiler API response:', data);

    if (data.features) {
      const suggestions = data.features.map((feature: any) => ({
        description: feature.place_name,
        place_id: feature.id
      }));
      
      return new Response(
        JSON.stringify({ suggestions }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ suggestions: [] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in places-autocomplete function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
