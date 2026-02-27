import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a helpful assistant for Annadataconnect, a food sharing and donation platform that connects food donors with receivers. Keep answers concise, friendly, and actionable.

PLATFORM OVERVIEW:
- Donors share surplus food; receivers browse and request it.
- Users sign up with email/password. Google sign-in is only for existing accounts.
- Users can be "Donor", "Receiver", or "Both".

DONATING FOOD:
- Click the "+" button in the navbar to open the donation form.
- Step 1: Enter food details — title, description, quantity (with unit: kg, g, pieces, litres), food type, diet type (Veg/Non-Veg), expiry date/time, and a food freshness rating (1-5 stars).
- Step 2: Set pickup location (with saved addresses support) and upload a food image.
- Donations appear on the dashboard for nearby receivers.

REQUESTING FOOD (Receiver):
- Browse available donations on the Dashboard. Donations show masked locations until approved.
- Use filters: "All", "Veg", or "Non-Veg" diet type buttons. Adjust search radius (1-50 km).
- View donations on a map or as cards. Each card shows a green "Veg" or red "Non-Veg" badge and a freshness rating badge.
- Tap the freshness info icon (ℹ) on a donation card to see the scale: ★★★★★ = Just-Made, ★★★★☆ = Fresh, ★★★☆☆ = Okay, ★★☆☆☆ = Poor, ★☆☆☆☆ = Aged.
- Click "Request Food" and add an optional message. Only one approved request per donation at a time.

REQUEST & PICKUP FLOW:
1. Receiver sends a request → Donor gets notified.
2. Donor reviews the request (sees receiver's name, email, phone, rating, and profile link) and approves or rejects.
3. On approval: donation status changes to "claimed", a countdown timer starts (default 30 min), and the receiver sees the exact pickup location.
4. Receiver confirms arrival → donor sees arrival notification.
5. Donor verifies pickup with a 6-digit OTP displayed to the receiver. Donor enters the OTP to complete.
6. After completion, both parties can rate each other (1-5 stars with optional review).

TIMER & EXTENSIONS:
- Approved requests have a countdown timer. If it expires, the request is auto-rejected.
- Receivers can request a time extension (up to 2 times). Donor can grant (+15 min) or reject.

CHAT:
- After a request is approved, donor and receiver can chat in real-time.
- Chat supports text messages and sharing live location (with map preview).
- Chat is only available for active, non-deleted donations.

PROFILE:
- View-only personal info (name, email, phone, user type).
- Profile photo can be changed up to 3 times per month.
- Shows average rating and total ratings count.
- When viewing another user's profile: shows their name, role badge, reliability score, rating, member-since date, and donation/pickup stats.

HISTORY:
- Donors see "Completed" and "Deleted" tabs.
- Completed cards show: food details, pickup location, receiver name ("To: Name"), and a "Helped" stat using weighted people-helped calculation.
- Receivers see completed pickups with exact pickup location.
- Individual ratings are NOT shown on history cards.
- Summary stats at the top: total completed donations, people helped, and reliability score.

IMPACT TRACKER:
- Donors see an Impact Dashboard with: total donated, completed donations, people helped (weighted calculation), monthly donation chart, food type breakdown, active streak, and an impact score.
- Badges are earned based on milestones. Donors can download/share an achievement certificate.

RELIABILITY & MODERATION:
- Reliability score (0-100%) based on average receiver ratings.
- 3 consecutive low ratings (≤2 stars) → warning notification.
- 5 consecutive low ratings → 48-hour account suspension.
- 7 consecutive low ratings → permanent account block.
- No-shows and late pickups affect the receiver's reliability.

NOTIFICATIONS:
- Push notifications for new requests, approvals, messages, extensions, and donation cancellations.
- Bell icon in navbar shows unread count.

LANGUAGE:
- Supports English and Telugu. Users can switch language from the navbar menu.

If asked about technical issues, suggest contacting support. Do not make up features that don't exist.`;

    console.log("Received message from user:", authUser.id);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI request failed");
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ reply: assistantMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get response. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
