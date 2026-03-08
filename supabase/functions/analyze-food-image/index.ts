import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a food identification assistant for a food donation app in India. Analyze the food image and return structured data. You MUST call the identify_food function with your analysis.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify this food item. Suggest a short title (in English), the food type, diet type, estimated quantity, quantity unit, and a freshness rating from 1-5.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identify_food",
              description: "Return structured food identification results",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Short descriptive title for the food, e.g. 'Steamed Rice', 'Fresh Tomatoes', 'Wheat Bread'",
                  },
                  food_type: {
                    type: "string",
                    enum: ["Vegetables", "Fruits", "Grains", "Dairy", "Prepared Food", "Bakery Products"],
                    description: "Category of the food item",
                  },
                  diet_type: {
                    type: "string",
                    enum: ["veg", "non-veg"],
                    description: "Whether the food is vegetarian or non-vegetarian",
                  },
                  quantity: {
                    type: "string",
                    description: "Estimated quantity as a number string, e.g. '2', '5'",
                  },
                  quantity_unit: {
                    type: "string",
                    enum: ["kg", "grams", "liters", "pieces", "servings"],
                    description: "Unit for the quantity",
                  },
                  rating: {
                    type: "number",
                    description: "Freshness rating 1-5 (1=aged, 5=just made)",
                  },
                },
                required: ["title", "food_type", "diet_type", "quantity", "quantity_unit", "rating"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "identify_food" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI analysis failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in response");
    }

    const foodData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(foodData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-food-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
