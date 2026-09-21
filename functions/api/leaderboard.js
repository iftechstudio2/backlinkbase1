export async function onRequestGet(context) {
  const supabaseUrl = context.env.SUPABASE_URL || "https://trjrqfpxxfadxeabvtvf.supabase.co";
  const supabaseKey = context.env.SUPABASE_ANON_KEY || context.env.SUPABASE_SERVICE_ROLE_KEY;

  // Query top 7 approved sites ordered by view_count desc, then submitted_at desc
  const query = `${supabaseUrl}/rest/v1/sites?select=id,url,domain,title,description,logo_url,favicon_url,category_id,categories(id,name,slug),view_count,submitted_at&status=eq.approved&order=view_count.desc,submitted_at.desc&limit=7`;

  try {
    const res = await fetch(query, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: "Failed to fetch leaderboard", details: errText }), {
        status: res.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const sites = await res.json();
    return new Response(JSON.stringify(sites || []), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=180, s-maxage=300"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
