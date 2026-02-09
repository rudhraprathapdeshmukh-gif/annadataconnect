import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  requestId: string;
}

function formatTimeTaken(acceptedAt: string, actualPickupAt: string): string {
  const timeTakenMs = new Date(actualPickupAt).getTime() - new Date(acceptedAt).getTime();
  const totalMinutes = Math.round(timeTakenMs / 60000);

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${totalMinutes} minutes`;
}

function getDonorEmailHtml(donorName: string, donationTitle: string, quantity: string, unit: string, receiverName: string, timeTaken: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎉 Donation Completed!</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Thank you for sharing food</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 18px; line-height: 1.6;">
                Hi <strong>${donorName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! Your food donation has been successfully picked up!
              </p>
              <!-- Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">📦 Item</span>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">${donationTitle}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">📊 Quantity</span>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">${quantity} ${unit}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">👤 Picked up by</span>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">${receiverName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">⏱️ Time Taken</span>
                          <p style="margin: 4px 0 0 0; color: #16a34a; font-size: 16px; font-weight: 600;">${timeTaken}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 32px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for making a difference in someone's life! 💚
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                With gratitude,<br>
                <strong style="color: #16a34a;">The Annadataconnect Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Annadataconnect. Reducing food waste, fighting hunger.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getReceiverEmailHtml(receiverName: string, donationTitle: string, quantity: string, unit: string, donorName: string, timeTaken: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🍲 Pickup Confirmed!</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Thank you for using Annadataconnect</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 18px; line-height: 1.6;">
                Hi <strong>${receiverName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Your food pickup has been confirmed!
              </p>
              <!-- Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">📦 Item</span>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">${donationTitle}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">📊 Quantity</span>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">${quantity} ${unit}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">🤝 Donated by</span>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">${donorName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">⏱️ Time Taken</span>
                          <p style="margin: 4px 0 0 0; color: #16a34a; font-size: 16px; font-weight: 600;">${timeTaken}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 32px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                We hope this meal brings you joy! 💚
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Warm regards,<br>
                <strong style="color: #16a34a;">The Annadataconnect Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Annadataconnect. Reducing food waste, fighting hunger.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    const { requestId }: EmailRequest = await req.json();
    console.log("Processing completion email for request:", requestId, "by user:", userId);

    if (!requestId) {
      throw new Error("Request ID is required");
    }

    // Create admin Supabase client for data access
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the request with donation details
    const { data: request, error: requestError } = await supabase
      .from("food_requests")
      .select(`id, requester_id, donation_id, accepted_at, actual_pickup_at`)
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      console.error("Error fetching request:", requestError);
      throw new Error("Failed to fetch request details");
    }

    // Fetch donation to verify caller is participant
    const { data: donation, error: donationError } = await supabase
      .from("food_donations")
      .select("id, title, quantity, quantity_unit, donor_id")
      .eq("id", request.donation_id)
      .single();

    if (donationError || !donation) {
      console.error("Error fetching donation:", donationError);
      throw new Error("Failed to fetch donation details");
    }

    // Verify caller is donor or receiver
    if (userId !== donation.donor_id && userId !== request.requester_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch donor profile
    const { data: donor, error: donorError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, notification_email")
      .eq("id", donation.donor_id)
      .single();

    if (donorError || !donor) {
      console.error("Error fetching donor:", donorError);
      throw new Error("Failed to fetch donor details");
    }

    // Fetch receiver profile
    const { data: receiver, error: receiverError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, notification_email")
      .eq("id", request.requester_id)
      .single();

    if (receiverError || !receiver) {
      console.error("Error fetching receiver:", receiverError);
      throw new Error("Failed to fetch receiver details");
    }

    // Calculate time taken
    const timeTaken = formatTimeTaken(request.accepted_at, request.actual_pickup_at);

    // Format names
    const donorName = `${donor.first_name || ''} ${donor.last_name || ''}`.trim() || 'Donor';
    const receiverName = `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim() || 'Receiver';

    const emailPromises = [];
    let donorEmailSkipped = false;
    let receiverEmailSkipped = false;

    if (donor.email && donor.notification_email !== false) {
      emailPromises.push(
        resend.emails.send({
          from: "Annadataconnect <onboarding@resend.dev>",
          to: [donor.email],
          subject: "🎉 Donation Completed! Thank you for sharing food",
          html: getDonorEmailHtml(donorName, donation.title, donation.quantity, donation.quantity_unit, receiverName, timeTaken),
        })
      );
    } else {
      donorEmailSkipped = true;
    }

    if (receiver.email && receiver.notification_email !== false) {
      emailPromises.push(
        resend.emails.send({
          from: "Annadataconnect <onboarding@resend.dev>",
          to: [receiver.email],
          subject: "🍲 Pickup Confirmed! Thank you for using Annadataconnect",
          html: getReceiverEmailHtml(receiverName, donation.title, donation.quantity, donation.quantity_unit, donorName, timeTaken),
        })
      );
    } else {
      receiverEmailSkipped = true;
    }

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ success: true, emailsSent: successCount, emailsFailed: failedCount, donorEmailSkipped, receiverEmailSkipped }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-completion-email function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
