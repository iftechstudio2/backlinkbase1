import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, url, title, description, category_id, logo_url } = body;

    if (action === "submit") {
      if (!url || !title) {
        return new Response(
          JSON.stringify({ error: "URL and title are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.startsWith("http") ? url : "https://" + url);
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid URL format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const domain = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();
      const cleanUrl = parsedUrl.origin;

      const { data: existing } = await supabase
        .from("sites")
        .select("id, domain")
        .eq("domain", domain)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "This website is already listed or submitted." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const finalLogo = logo_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

      const { data, error } = await supabase
        .from("sites")
        .insert({
          url: cleanUrl,
          domain: domain,
          title: title.slice(0, 120),
          description: (description || "").slice(0, 500),
          category_id: category_id || null,
          logo_url: finalLogo,
          status: "pending",
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, site: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
