import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a helpful assistant for Annadataconnect, a food donation platform. 
Help users with:
- How to donate food (click "Share Food" in navbar)
- How to request food (browse available donations on dashboard)
- Understanding the request/approval process
- Timer and pickup procedures
- Rating system and reliability scores
- Location sharing in chat
- Profile management

NEW FEATURES:
- Diet Type Filter: On the receiver dashboard, users can filter donations by diet preference using the "All", "Veg", or "Non-Veg" buttons at the top of the available food section.
- Diet Type Badges: Each donation card shows a green "Veg" or red "Non-Veg" badge on the top-left of the food image.
- Food Freshness Rating: Donation cards display a freshness badge (top-right). Hover over it to see the rating scale:
  ★★★★★ = Just-Made (freshest)
  ★★★★☆ = Fresh
  ★★★☆☆ = Okay
  ★★☆☆☆ = Poor
  ★☆☆☆☆ = Aged

Keep answers concise, friendly, and actionable. If asked about technical issues, suggest contacting support.`;

    console.log("Received message:", message);

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

    console.log("AI response received successfully");

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
