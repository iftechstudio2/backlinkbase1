export async function onRequestPost(context) {
  const req = context.request;
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
  const resendKey = context.env.RESEND_API_KEY;
  const secretKey = context.env.SUPABASE_SERVICE_ROLE_KEY || "backlinkbase-otp-secret-key-2026";
  const sbUrl = context.env.SUPABASE_URL || "https://trjrqfpxxfadxeabvtvf.supabase.co";

  try {
    const { email, domain } = await req.json();
    if (!email || !domain) {
      return new Response(JSON.stringify({ error: "Missing email or domain" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const emailTrim = email.trim().toLowerCase();
    const domainTrim = domain.trim().toLowerCase().replace(/^www\./, "");
    
    // Domain match check
    const emailParts = emailTrim.split("@");
    if (emailParts.length !== 2 || emailParts[1] !== domainTrim) {
      return new Response(JSON.stringify({ error: `Email domain must match official website (@${domainTrim})` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Rate limit check: 1 per IP per 30 minutes
    const bucketKey = "otp:ip:" + ip;
    try {
      const checkRes = await fetch(`${sbUrl}/rest/v1/rate_limit_buckets?bucket_key=eq.${encodeURIComponent(bucketKey)}`, {
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`
        }
      });
      if (checkRes.ok) {
        const buckets = await checkRes.json();
        if (buckets && buckets.length > 0) {
          const lastTime = new Date(buckets[0].updated_at || buckets[0].window_started_at).getTime();
          const thirtyMins = 30 * 60 * 1000;
          if (Date.now() - lastTime < thirtyMins) {
            const remainingMins = Math.ceil((thirtyMins - (Date.now() - lastTime)) / 60000);
            return new Response(JSON.stringify({
              error: `Rate limit reached. Please wait ${remainingMins} minutes before requesting another code.`
            }), {
              status: 429,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      }
    } catch (e) {
      console.error("Rate limit check error:", e);
    }

    // Generate 6 digit code & 10 min expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // Send email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "BacklinkBase Verification <verify@backlinkbase.org>",
        to: [emailTrim],
        subject: `Your BacklinkBase Verification Code: ${otp}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
              <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#111827;">BacklinkBase</span>
            </div>
            <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:12px;">Verify Domain Ownership & Promotion</h2>
            <p style="color:#4b5563;font-size:15px;line-height:24px;margin-bottom:24px;">
              Someone is submitting an exclusive promotion/discount for <strong>${domainTrim}</strong> on BacklinkBase. Use the verification code below to confirm domain ownership:
            </p>
            <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;letter-spacing:6px;font-size:32px;font-weight:700;color:#111827;margin-bottom:24px;">
              ${otp}
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:20px;margin-bottom:0;">
              This code will expire in <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.
            </p>
          </div>
        `
      })
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      return new Response(JSON.stringify({ error: "Failed to deliver email: " + errText }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Record rate limit in Supabase
    try {
      await fetch(`${sbUrl}/rest/v1/rate_limit_buckets`, {
        method: "POST",
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          bucket_key: bucketKey,
          updated_at: new Date().toISOString(),
          hits: 1
        })
      });
    } catch (e) {}

    // Sign challenge token (HMAC-SHA256)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const payloadStr = JSON.stringify({ otp, email: emailTrim, domain: domainTrim, expiresAt });
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payloadStr));
    const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
    const token = btoa(payloadStr) + "." + sigHex;

    return new Response(JSON.stringify({
      success: true,
      message: "Verification code sent! Please check your domain inbox.",
      challengeToken: token,
      expiresAt: expiresAt
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}