import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/** 
 * Send a single Web Push notification using native Web Crypto (no npm deps).
 * Implements VAPID signing with ES256 (P-256 / SHA-256).
 */
async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<{ ok: boolean; status?: number }> {
  try {
    // --- VAPID JWT ---
    const audience = new URL(subscription.endpoint).origin;
    const header = { typ: "JWT", alg: "ES256" };
    const now = Math.floor(Date.now() / 1000);
    const claims = { aud: audience, exp: now + 12 * 3600, sub: subject };

    const enc = new TextEncoder();
    const b64url = (buf: ArrayBuffer | Uint8Array) =>
      btoa(String.fromCharCode(...new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const headerB64 = b64url(enc.encode(JSON.stringify(header)));
    const claimsB64 = b64url(enc.encode(JSON.stringify(claims)));
    const unsignedToken = `${headerB64}.${claimsB64}`;

    // Import VAPID private key (URL-safe base64 → raw 32 bytes)
    const privKeyBytes = Uint8Array.from(
      atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const privKey = await crypto.subtle.importKey(
      "pkcs8",
      buildPkcs8(privKeyBytes),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    const sig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privKey,
      enc.encode(unsignedToken)
    );

    // Convert DER signature to raw r||s (64 bytes)
    const rawSig = derToRaw(new Uint8Array(sig));
    const jwt = `${unsignedToken}.${b64url(rawSig)}`;

    // Decode VAPID public key for the Authorization header
    const pubKeyBytes = Uint8Array.from(
      atob(vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const vapidAuth = `vapid t=${jwt}, k=${b64url(pubKeyBytes)}`;

    // --- Encryption (aes128gcm per RFC 8291) ---
    const p256dhBytes = Uint8Array.from(
      atob(subscription.keys.p256dh.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const authSecret = Uint8Array.from(
      atob(subscription.keys.auth.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    // Generate local ECDH key pair
    const localKey = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ]);
    const localPubRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", localKey.publicKey)
    );

    // Import subscriber's p256dh public key
    const subPubKey = await crypto.subtle.importKey(
      "raw",
      p256dhBytes,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );

    // ECDH shared secret
    const sharedSecret = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "ECDH", public: subPubKey },
        localKey.privateKey,
        256
      )
    );

    // HKDF for IKM
    const ikmInfo = concatBuffers(
      enc.encode("WebPush: info\0"),
      p256dhBytes,
      localPubRaw
    );
    const ikm = await hkdf(authSecret, sharedSecret, ikmInfo, 32);

    // Salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive CEK and nonce
    const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

    // Encrypt payload
    const paddedPayload = concatBuffers(new Uint8Array([2]), enc.encode(payload));
    const cryptoKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, paddedPayload)
    );

    // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
    const rs = new Uint8Array(4);
    new DataView(rs.buffer).setUint32(0, 4096);
    const body = concatBuffers(
      salt,
      rs,
      new Uint8Array([localPubRaw.length]),
      localPubRaw,
      encrypted
    );

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidAuth,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
      },
      body,
    });

    return { ok: response.ok, status: response.status };
  } catch (err) {
    console.warn("Push send error:", err);
    return { ok: false, status: 0 };
  }
}

// --- Crypto helpers ---

function concatBuffers(...bufs: Uint8Array[]): Uint8Array {
  const total = bufs.reduce((n, b) => n + b.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const b of bufs) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), ikm)
  );
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const infoWithCounter = concatBuffers(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

function buildPkcs8(rawPrivKey: Uint8Array): Uint8Array {
  // PKCS#8 wrapper for EC P-256 private key
  const prefix = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x27, 0x30, 0x25,
    0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  return concatBuffers(prefix, rawPrivKey);
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If it's already 64 bytes (raw format), return as-is
  if (der.length === 64) return der;
  
  // Parse DER SEQUENCE
  if (der[0] !== 0x30) return der;
  let offset = 2;
  // r
  if (der[offset] !== 0x02) return der;
  const rLen = der[offset + 1];
  offset += 2;
  const r = der.slice(offset, offset + rLen);
  offset += rLen;
  // s
  if (der[offset] !== 0x02) return der;
  const sLen = der[offset + 1];
  offset += 2;
  const s = der.slice(offset, offset + sLen);

  const raw = new Uint8Array(64);
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  return raw;
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

    // Send Web Push notifications using native crypto
    const notifiedUserIds = Array.from(notificationMap.keys());
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (vapidPrivateKey && vapidPublicKey && notifiedUserIds.length > 0) {
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

          const result = await sendPushNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            vapidPublicKey,
            vapidPrivateKey,
            "mailto:noreply@annadataconnect.lovable.app"
          );

          if (result.ok) {
            pushSent++;
          } else if (result.status === 404 || result.status === 410) {
            staleEndpoints.push(sub.endpoint);
          } else {
            console.warn(`Push failed for ${sub.user_id}: status ${result.status}`);
          }
        }

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
