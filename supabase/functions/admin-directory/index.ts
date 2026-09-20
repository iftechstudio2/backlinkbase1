import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized admin access" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, id, status, query } = body;

    if (action === "stats") {
      const { count: totalSites } = await supabaseAdmin.from("sites").select("*", { count: "exact", head: true });
      const { count: pendingSites } = await supabaseAdmin.from("sites").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: approvedSites } = await supabaseAdmin.from("sites").select("*", { count: "exact", head: true }).eq("status", "approved");
      const { count: categoriesCount } = await supabaseAdmin.from("categories").select("*", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          total: totalSites || 0,
          pending: pendingSites || 0,
          approved: approvedSites || 0,
          categories: categoriesCount || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list") {
      let q = supabaseAdmin.from("sites").select("*, categories(name)").order("created_at", { ascending: false });
      if (status && status !== "all") {
        q = q.eq("status", status);
      }
      if (query) {
        q = q.ilike("title", `%${query}%`);
      }
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return new Response(JSON.stringify({ sites: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_status") {
      if (!id || !status) throw new Error("ID and status required");
      const { data, error } = await supabaseAdmin.from("sites").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, site: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!id) throw new Error("ID required");
      const { error } = await supabaseAdmin.from("sites").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Operation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
