import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const responseHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Photo access is temporarily unavailable" }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const token = authorization.slice("Bearer ".length).trim();
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string" || !uuidPattern.test(userId)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
  if (typeof body !== "object" || body === null) return jsonResponse({ error: "Invalid request" }, 400);

  const jobId = "jobId" in body ? body.jobId : null;
  const path = "path" in body ? body.path : null;
  if (typeof jobId !== "string" || !uuidPattern.test(jobId) || typeof path !== "string" || path.length > 512) {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  const { data: job, error: jobError } = await userClient
    .from("jobs")
    .select("customer_id, images")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError || !job) return jsonResponse({ error: "Job not found" }, 404);

  const segments = path.split("/");
  if (
    !Array.isArray(job.images) ||
    !job.images.includes(path) ||
    segments.length !== 2 ||
    segments[0] !== job.customer_id ||
    !segments[1] ||
    segments[1].includes("..")
  ) {
    return jsonResponse({ error: "Photo is not available for this job" }, 403);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: signedData, error: signingError } = await serviceClient.storage
    .from("job-photos")
    .createSignedUrl(path, 60 * 60 * 24);
  if (signingError || !signedData?.signedUrl) {
    return jsonResponse({ error: "Photo is not available" }, 404);
  }

  return jsonResponse({ signedUrl: signedData.signedUrl });
});
