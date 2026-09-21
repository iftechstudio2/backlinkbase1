export async function onRequestGet(context) {
  const url = context.env.SUPABASE_URL || "https://trjrqfpxxfadxeabvtvf.supabase.co";
  const key = context.env.SUPABASE_ANON_KEY || context.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const res = await fetch(`${url}/rest/v1/categories?select=id,name,slug,description&order=name.asc`, {
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
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
