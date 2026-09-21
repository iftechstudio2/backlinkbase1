export async function onRequestGet(context) {
  const url = context.env.SUPABASE_URL || "https://trjrqfpxxfadxeabvtvf.supabase.co";
  const key = context.env.SUPABASE_ANON_KEY || context.env.SUPABASE_SERVICE_ROLE_KEY;
  const searchParams = new URL(context.request.url).searchParams;
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  let query = `${url}/rest/v1/sites?select=id,url,domain,title,description,logo_url,favicon_url,category_id,categories(id,name,slug),submitted_at&status=eq.approved&order=submitted_at.desc&limit=${limit}`;
  if (category) {
    query += `&category_id=eq.${encodeURIComponent(category)}`;
  }
  if (search) {
    query += `&or=(title.ilike.*${encodeURIComponent(search)}*,description.ilike.*${encodeURIComponent(search)}*,domain.ilike.*${encodeURIComponent(search)}*)`;
  }

  try {
    const res = await fetch(query, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
