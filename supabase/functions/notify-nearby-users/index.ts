import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify service role key - this function is called by database trigger only
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - service role required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { donation_id, donor_id, latitude, longitude, title } = await req.json();

    if (!donation_id || latitude == null || longitude == null || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: donation_id, latitude, longitude, title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const donLat = Number(latitude);
    const donLng = Number(longitude);

    const { data: nearbyUsers, error: queryError } = await supabase
      .from("profiles")
      .select("id, latitude, longitude, notification_push, user_type")
      .or("user_type.eq.receiver,user_type.eq.both")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (queryError) {
      console.error("Error querying profiles:", queryError);
      return new Response(
        JSON.stringify({ error: "Failed to query nearby users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nearbyUsers || nearbyUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No nearby users found", notifications_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RADIUS_KM = 10;
    const toRad = (deg: number) => deg * (Math.PI / 180);

    const nearbyWithDistance = nearbyUsers
      .filter((u) => {
        if (u.id === donor_id) return false;
        if (u.notification_push === false) return false;
        return true;
      })
      .map((u) => {
        const uLat = Number(u.latitude);
        const uLng = Number(u.longitude);
        const R = 6371;
        const dLat = toRad(uLat - donLat);
        const dLon = toRad(uLng - donLng);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(donLat)) *
            Math.cos(toRad(uLat)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return { ...u, distance: Math.round(distance * 10) / 10 };
      })
      .filter((u) => u.distance <= RADIUS_KM);

    if (nearbyWithDistance.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users within 10km radius", notifications_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationRows = nearbyWithDistance.map((u) => ({
      user_id: u.id,
      type: "nearby_donation",
      title: "New Food Donation Nearby! 🍽️",
      message: `"${title}" is available ${u.distance} km away!`,
      related_id: donation_id,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (insertError) {
      console.error("Error inserting notifications:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to insert notifications" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully sent ${notificationRows.length} nearby donation notifications`);

    return new Response(
      JSON.stringify({
        message: "Notifications sent successfully",
        notifications_sent: notificationRows.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
