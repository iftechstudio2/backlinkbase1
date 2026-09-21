export async function onRequestPost(context) {
  const url = context.env.SUPABASE_URL || "https://trjrqfpxxfadxeabvtvf.supabase.co";
  const key = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_ANON_KEY;
  const secretKey = context.env.SUPABASE_SERVICE_ROLE_KEY || "backlinkbase-otp-secret-key-2026";

  try {
    const body = await context.request.json();

    // If promo is included, verify the proofToken
    let promoVerified = false;
    if (body.has_promo && body.promo_proof) {
      try {
        const parts = body.promo_proof.split(".");
        if (parts.length === 2) {
          const [payloadB64, sigHex] = parts;
          const payloadStr = atob(payloadB64);
          const payload = JSON.parse(payloadStr);

          const encoder = new TextEncoder();
          const cryptoKey = await crypto.subtle.importKey(
            "raw", encoder.encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
          );
          const expectedSig = new Uint8Array(sigHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
          const valid = await crypto.subtle.verify("HMAC", cryptoKey, expectedSig, encoder.encode(payloadStr));
          if (valid && payload.verified && payload.domain === (body.domain || "").toLowerCase()) {
            promoVerified = true;
          }
        }
      } catch (e) {}
    }

    // Attach promo verification state
    const submitPayload = {
      ...body,
      promo_verified: promoVerified
    };

    const res = await fetch(`${url}/functions/v1/directory-write`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(submitPayload)
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}