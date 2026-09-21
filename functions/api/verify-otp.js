export async function onRequestPost(context) {
  const req = context.request;
  const secretKey = context.env.SUPABASE_SERVICE_ROLE_KEY || "backlinkbase-otp-secret-key-2026";

  try {
    const { challengeToken, code, domain, email } = await req.json();
    if (!challengeToken || !code || !domain || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const parts = challengeToken.split(".");
    if (parts.length !== 2) {
      return new Response(JSON.stringify({ error: "Invalid challenge token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const [payloadB64, sigHex] = parts;
    const payloadStr = atob(payloadB64);
    const payload = JSON.parse(payloadStr);

    // Verify HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const expectedSig = new Uint8Array(sigHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const isValid = await crypto.subtle.verify("HMAC", cryptoKey, expectedSig, encoder.encode(payloadStr));

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid token signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check expiration (10 min)
    if (Date.now() > payload.expiresAt) {
      return new Response(JSON.stringify({ error: "Verification code has expired (10 min limit). Please request a new code." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check code and domain
    if (payload.otp !== code.trim() || payload.domain !== domain.trim().toLowerCase() || payload.email !== email.trim().toLowerCase()) {
      return new Response(JSON.stringify({ error: "Incorrect verification code. Please check and try again." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Create Proof Token
    const proofPayload = JSON.stringify({
      domain: payload.domain,
      email: payload.email,
      verified: true,
      verifiedAt: Date.now()
    });
    const proofSig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(proofPayload));
    const proofSigHex = Array.from(new Uint8Array(proofSig)).map(b => b.toString(16).padStart(2, "0")).join("");
    const proofToken = btoa(proofPayload) + "." + proofSigHex;

    return new Response(JSON.stringify({
      success: true,
      verified: true,
      message: "Domain ownership verified successfully!",
      proofToken: proofToken
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