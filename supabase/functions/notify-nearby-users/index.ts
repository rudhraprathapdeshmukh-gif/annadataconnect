import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getDistrict(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address;
    return addr?.city || addr?.town || addr?.state_district || addr?.county || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const donationDistrict = await getDistrict(donLat, donLng);
    console.log(`Donation district resolved: ${donationDistrict}`);

    const { data: allReceivers, error: queryError } = await supabase
      .from("profiles")
      .select("id, latitude, longitude, notification_push, user_type, district")
      .or("user_type.eq.receiver,user_type.eq.both");

    if (queryError) {
      console.error("Error querying profiles:", queryError);
      return new Response(
        JSON.stringify({ error: "Failed to query nearby users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!allReceivers || allReceivers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No receivers found", notifications_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RADIUS_KM = 10;
    const toRad = (deg: number) => deg * (Math.PI / 180);

    const notificationMap = new Map<string, { id: string; message: string }>();

    for (const u of allReceivers) {
      if (u.id === donor_id) continue;
      if (u.notification_push === false) continue;

      let isNearby = false;
      let distance = Infinity;

      if (u.latitude != null && u.longitude != null) {
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
        distance = R * c;
        isNearby = distance <= RADIUS_KM;
      }

      const isDistrictMatch =
        donationDistrict &&
        u.district &&
        u.district.toLowerCase() === donationDistrict.toLowerCase();

      if (isNearby) {
        const roundedDist = Math.round(distance * 10) / 10;
        notificationMap.set(u.id, {
          id: u.id,
          message: `"${title}" is available ${roundedDist} km away!`,
        });
      } else if (isDistrictMatch && !notificationMap.has(u.id)) {
        notificationMap.set(u.id, {
          id: u.id,
          message: `"${title}" is available in ${donationDistrict}!`,
        });
      }
    }

    if (notificationMap.size === 0) {
      return new Response(
        JSON.stringify({ message: "No matching receivers found", notifications_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationRows = Array.from(notificationMap.values()).map((u) => ({
      user_id: u.id,
      type: "nearby_donation",
      title: "New Food Donation Nearby! 🍽️",
      message: u.message,
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

    console.log(`Successfully sent ${notificationRows.length} notifications (nearby + district)`);

    // Send Web Push notifications with proper VAPID signing
    const notifiedUserIds = Array.from(notificationMap.keys());
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (vapidPrivateKey && vapidPublicKey && notifiedUserIds.length > 0) {
      webpush.setVapidDetails(
        "mailto:noreply@annadataconnect.lovable.app",
        vapidPublicKey,
        vapidPrivateKey
      );

      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth, user_id")
        .in("user_id", notifiedUserIds);

      if (subscriptions && subscriptions.length > 0) {
        let pushSent = 0;
        const staleEndpoints: string[] = [];

        for (const sub of subscriptions) {
          const userNotif = notificationMap.get(sub.user_id);
          const payload = JSON.stringify({
            title: "New Food Donation Nearby! 🍽️",
            message: userNotif?.message || "A new food donation is available in your area!",
            id: donation_id,
          });

          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            pushSent++;
          } catch (pushErr: any) {
            const statusCode = pushErr?.statusCode;
            console.warn(`Push failed for ${sub.user_id}: ${statusCode || pushErr}`);
            // Clean up stale subscriptions (gone or not found)
            if (statusCode === 404 || statusCode === 410) {
              staleEndpoints.push(sub.endpoint);
            }
          }
        }

        // Remove stale subscriptions
        if (staleEndpoints.length > 0) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .in("endpoint", staleEndpoints);
          console.log(`Cleaned up ${staleEndpoints.length} stale push subscriptions`);
        }

        console.log(`Sent ${pushSent}/${subscriptions.length} web push notifications`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Notifications sent successfully",
        notifications_sent: notificationRows.length,
        district: donationDistrict,
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
