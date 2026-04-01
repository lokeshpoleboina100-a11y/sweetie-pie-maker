import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // Verify user identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Use service role to check admin status and fetch data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("Forbidden: not an admin");

    const { action, ...params } = await req.json();

    let result: any;

    switch (action) {
      case "get_stats": {
        const [profiles, jobs, payments, reviews] = await Promise.all([
          supabase.from("profiles").select("id, role, created_at", { count: "exact" }),
          supabase.from("jobs").select("id, status, created_at, budget_max", { count: "exact" }),
          supabase.from("payments").select("id, amount, commission, status, created_at", { count: "exact" }),
          supabase.from("reviews").select("id", { count: "exact" }),
        ]);

        const totalRevenue = (payments.data || [])
          .filter((p: any) => p.status === "completed")
          .reduce((sum: number, p: any) => sum + (p.commission || 0), 0);

        const customerCount = (profiles.data || []).filter((p: any) => p.role === "customer").length;
        const workerCount = (profiles.data || []).filter((p: any) => p.role === "worker").length;

        const jobsByStatus: Record<string, number> = {};
        (jobs.data || []).forEach((j: any) => {
          jobsByStatus[j.status] = (jobsByStatus[j.status] || 0) + 1;
        });

        // Monthly trends (last 6 months)
        const monthlyJobs: Record<string, number> = {};
        const monthlyRevenue: Record<string, number> = {};
        (jobs.data || []).forEach((j: any) => {
          const month = j.created_at.substring(0, 7);
          monthlyJobs[month] = (monthlyJobs[month] || 0) + 1;
        });
        (payments.data || []).filter((p: any) => p.status === "completed").forEach((p: any) => {
          const month = p.created_at.substring(0, 7);
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + p.commission;
        });

        result = {
          totalUsers: profiles.count || 0,
          customerCount,
          workerCount,
          totalJobs: jobs.count || 0,
          jobsByStatus,
          totalRevenue,
          totalPayments: payments.count || 0,
          totalReviews: reviews.count || 0,
          monthlyJobs,
          monthlyRevenue,
        };
        break;
      }

      case "get_users": {
        const { page = 0, limit = 20, search } = params;
        let query = supabase
          .from("profiles")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * limit, (page + 1) * limit - 1);

        if (search) {
          query = query.ilike("full_name", `%${search}%`);
        }

        const { data, count } = await query;
        result = { users: data || [], total: count || 0 };
        break;
      }

      case "get_jobs": {
        const { page = 0, limit = 20, status } = params;
        let query = supabase
          .from("jobs")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * limit, (page + 1) * limit - 1);

        if (status) query = query.eq("status", status);

        const { data, count } = await query;
        result = { jobs: data || [], total: count || 0 };
        break;
      }

      case "toggle_verify": {
        const { userId, verified } = params;
        await supabase.from("profiles").update({ is_verified: verified }).eq("user_id", userId);
        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const status = error.message.includes("Forbidden") ? 403 : error.message.includes("Unauthorized") ? 401 : 400;
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
