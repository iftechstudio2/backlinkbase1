export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  const isJson = url.searchParams.get("format") === "json" || (context.request.headers.get("accept") || "").includes("application/json");

  // UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    return new Response(JSON.stringify({ error: "Invalid or missing site ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = context.env.SUPABASE_URL || "https://trjrqfpxxfadxeabvtvf.supabase.co";
  const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_ANON_KEY;

  try {
    // 1. Fetch site target URL and current views
    const siteRes = await fetch(`${supabaseUrl}/rest/v1/sites?id=eq.${encodeURIComponent(id)}&select=id,url,domain,status,view_count`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!siteRes.ok) {
      return new Response("Site not found", { status: 404 });
    }

    const sites = await siteRes.json();
    if (!sites || sites.length === 0) {
      return new Response("Site not found", { status: 404 });
    }

    const site = sites[0];
    let targetUrl = site.url || ("https://" + site.domain);
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    // 2. Anti-spam / Bot filtering
    const userAgent = (context.request.headers.get("user-agent") || "").toLowerCase();
    const isBot = /bot|crawl|spider|slurp|facebookexternalhit|bingpreview|google|lighthouse/i.test(userAgent);

    // 3. Cookie check (1 visit counted per site per client per 24 hours)
    const cookieHeader = context.request.headers.get("cookie") || "";
    const shortId = id.replace(/-/g, "").slice(0, 8);
    const cookieName = `bb_v_${shortId}`;
    const alreadyVisited = cookieHeader.includes(`${cookieName}=1`);

    let updatedCount = Number(site.view_count || 0);

    if (!isBot && !alreadyVisited) {
      // Valid unique human visit -> increment view_count
      updatedCount += 1;
      const updatePromise = fetch(`${supabaseUrl}/rest/v1/sites?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ view_count: updatedCount })
      }).catch(() => {});

      if (context.waitUntil) {
        context.waitUntil(updatePromise);
      } else {
        await updatePromise;
      }
    }

    if (isJson) {
      return new Response(JSON.stringify({ ok: true, url: targetUrl, views: updatedCount }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Set 24-hour cookie so repeated clicks within 24h don't inflate views
    const headers = new Headers();
    headers.set("Location", targetUrl);
    headers.set("Set-Cookie", `${cookieName}=1; Max-Age=86400; Path=/; SameSite=Lax; HttpOnly; Secure`);
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    return new Response(null, {
      status: 302,
      headers
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
