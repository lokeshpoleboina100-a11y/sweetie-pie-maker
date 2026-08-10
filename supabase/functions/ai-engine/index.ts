// NearWork AI Engine — real scoring endpoints backed by live database data.
//
// Actions (POST body { action, payload }):
//   recommend-workers  -> weighted multi-feature worker recommendation for a job
//   rank-bids          -> smart bid ranking (rating / distance / price / experience)
//
// Every score is computed from rows in Postgres. Results are persisted to
// public.ai_predictions with model name + version so they are auditable and the
// scoring layer can later be swapped for a trained model.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const err = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  json({ error: message, ...extra }, status);

// ---------- math helpers ----------

function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Min-max normalise to 0..100. `invert` makes lower raw values score higher. */
function normalise(values: (number | null)[], invert = false): number[] {
  const present = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (present.length === 0) return values.map(() => 50);
  const min = Math.min(...present);
  const max = Math.max(...present);
  const mid = present.reduce((s, v) => s + v, 0) / present.length;
  return values.map((v) => {
    const raw = v == null || !Number.isFinite(v as number) ? mid : (v as number);
    if (max === min) return 50;
    const pct = ((raw - min) / (max - min)) * 100;
    return invert ? 100 - pct : pct;
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------- auth ----------

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return { user: null as null, status: 401 };
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await anon.auth.getUser();
  if (error || !data.user) return { user: null as null, status: 401 };
  return { user: data.user, status: 200 };
}

// ---------- feature building ----------

interface WorkerRow {
  user_id: string;
  full_name: string;
  rating: number | null;
  total_reviews: number | null;
  total_jobs_completed: number | null;
  experience_years: number | null;
  service_radius_km: number | null;
  skills: string[] | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  is_verified: boolean | null;
}

/**
 * Median minutes between a job being posted and this worker bidding on it.
 * Real responsiveness measured from the bids table, null when unknown.
 */
function responseMinutesFromBids(
  bids: { worker_id: string; created_at: string; job_id: string }[],
  jobsCreatedAt: Map<string, string>,
): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const b of bids) {
    const posted = jobsCreatedAt.get(b.job_id);
    if (!posted) continue;
    const mins = (new Date(b.created_at).getTime() - new Date(posted).getTime()) / 60000;
    if (!Number.isFinite(mins) || mins < 0) continue;
    const arr = buckets.get(b.worker_id) ?? [];
    arr.push(mins);
    buckets.set(b.worker_id, arr);
  }
  const out = new Map<string, number>();
  for (const [id, arr] of buckets) {
    arr.sort((x, y) => x - y);
    out.set(id, arr[Math.floor(arr.length / 2)]);
  }
  return out;
}

// ---------- actions ----------

async function recommendWorkers(db: any, userId: string, payload: any) {
  const jobId: string | undefined = payload?.job_id ?? payload?.service_request_id;
  if (!jobId) return err(400, "job_id is required");

  const { data: job, error: jobErr } = await db
    .from("jobs")
    .select("id, customer_id, title, description, category, budget_min, budget_max, latitude, longitude, location_name, created_at")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr) return err(500, "Could not load the service request");
  if (!job) return err(404, "Service request not found");
  if (job.customer_id !== userId) return err(403, "You can only get recommendations for your own request");

  const jobLat = payload?.customer_location?.latitude ?? job.latitude;
  const jobLng = payload?.customer_location?.longitude ?? job.longitude;
  const category = payload?.service_category ?? job.category;

  const { data: workers } = await db
    .from("profiles")
    .select("user_id, full_name, rating, total_reviews, total_jobs_completed, experience_years, service_radius_km, skills, latitude, longitude, location_name, is_verified")
    .eq("role", "worker")
    .limit(200);

  const candidates: WorkerRow[] = (workers ?? []).filter(
    (w: WorkerRow) => w.user_id !== userId,
  );
  if (candidates.length === 0) {
    return json({ job_id: jobId, service_category: category, recommendations: [], message: "No worker profiles available yet." });
  }

  const ids = candidates.map((w) => w.user_id);

  // Live bids on this job (bid amount feature) + historical bids (response time).
  const [{ data: jobBids }, { data: histBids }] = await Promise.all([
    db.from("bids").select("worker_id, amount, created_at").eq("job_id", jobId),
    db.from("bids").select("worker_id, job_id, created_at").in("worker_id", ids).limit(2000),
  ]);

  const histJobIds = [...new Set((histBids ?? []).map((b: any) => b.job_id))];
  const { data: histJobs } = histJobIds.length
    ? await db.from("jobs").select("id, created_at, accepted_worker_id").in("id", histJobIds)
    : { data: [] as any[] };
  const postedAt = new Map<string, string>((histJobs ?? []).map((j: any) => [j.id, j.created_at]));
  const responseMins = responseMinutesFromBids((histBids ?? []) as any[], postedAt);

  // Historical success rate: share of this worker's bids that were accepted.
  const bidCounts = new Map<string, number>();
  const winCounts = new Map<string, number>();
  const winnerByJob = new Map<string, string | null>(
    (histJobs ?? []).map((j: any) => [j.id, j.accepted_worker_id]),
  );
  for (const b of (histBids ?? []) as any[]) {
    bidCounts.set(b.worker_id, (bidCounts.get(b.worker_id) ?? 0) + 1);
    if (winnerByJob.get(b.job_id) === b.worker_id) {
      winCounts.set(b.worker_id, (winCounts.get(b.worker_id) ?? 0) + 1);
    }
  }

  const bidAmount = new Map<string, number>(
    (jobBids ?? []).map((b: any) => [b.worker_id, b.amount]),
  );

  const feats = candidates.map((w) => {
    const distance =
      jobLat != null && jobLng != null && w.latitude != null && w.longitude != null
        ? round1(haversineKm(jobLat, jobLng, w.latitude, w.longitude))
        : null;
    const skills = (w.skills ?? []).map((s) => String(s).toLowerCase());
    const skillMatch = skills.includes(String(category).toLowerCase());
    const inRadius =
      distance != null && w.service_radius_km != null ? distance <= w.service_radius_km : null;
    const totalBids = bidCounts.get(w.user_id) ?? 0;
    return {
      worker: w,
      distance,
      skillMatch,
      inRadius,
      // Availability: covers the area, and has been active recently.
      availabilityRaw:
        (inRadius === true ? 60 : inRadius === false ? 15 : 35) +
        (totalBids > 0 ? 25 : 0) +
        (w.is_verified ? 15 : 0),
      rating: w.rating != null && w.total_reviews ? w.rating : null,
      experience: w.experience_years ?? null,
      responseMin: responseMins.get(w.user_id) ?? null,
      completed: w.total_jobs_completed ?? 0,
      successRate: totalBids > 0 ? ((winCounts.get(w.user_id) ?? 0) / totalBids) * 100 : null,
      bid: bidAmount.get(w.user_id) ?? null,
    };
  });

  const ratingS = normalise(feats.map((f) => f.rating));
  const distanceS = normalise(feats.map((f) => f.distance), true);
  const expS = normalise(feats.map((f) => f.experience));
  const availS = normalise(feats.map((f) => f.availabilityRaw));
  const respS = normalise(feats.map((f) => f.responseMin), true);
  const compS = normalise(feats.map((f) => 0.6 * f.completed + 0.4 * ((f.successRate ?? 50) / 100) * 10));
  const bidS = normalise(feats.map((f) => f.bid), true);

  const recommendations = feats
    .map((f, i) => {
      const breakdown = {
        rating: round1(ratingS[i]),
        distance: round1(distanceS[i]),
        experience: round1(expS[i]),
        availability: round1(availS[i]),
        response: round1(respS[i]),
        completion: round1(compS[i]),
        bid: round1(bidS[i]),
      };
      let score =
        0.25 * breakdown.rating +
        0.20 * breakdown.distance +
        0.15 * breakdown.experience +
        0.15 * breakdown.availability +
        0.10 * breakdown.response +
        0.10 * breakdown.completion +
        0.05 * breakdown.bid;
      // Skill match is a hard relevance signal, not a scored feature.
      if (f.skillMatch) score = Math.min(100, score * 1.15);
      else score *= 0.7;

      const reasons: string[] = [];
      if (f.skillMatch) reasons.push(`Skilled in this service category`);
      if (f.rating != null && f.rating >= 4) reasons.push(`${f.rating} rating from ${f.worker.total_reviews} reviews`);
      if (f.distance != null) reasons.push(`${f.distance} km away`);
      if (f.inRadius) reasons.push("Job is inside their service area");
      if (f.experience) reasons.push(`${f.experience} years experience`);
      if (f.responseMin != null) reasons.push(`Typically responds in ${Math.round(f.responseMin)} min`);
      if (f.completed) reasons.push(`${f.completed} jobs completed`);
      if (f.successRate != null) reasons.push(`${Math.round(f.successRate)}% bid success rate`);
      if (f.bid != null) reasons.push(`Already bid ₹${f.bid}`);
      if (f.worker.is_verified) reasons.push("Verified worker");

      return {
        worker_id: f.worker.user_id,
        worker_name: f.worker.full_name,
        distance_km: f.distance,
        rating: f.rating,
        total_reviews: f.worker.total_reviews ?? 0,
        experience_years: f.experience,
        is_verified: !!f.worker.is_verified,
        location_name: f.worker.location_name,
        availability: f.inRadius === true ? "available_in_area" : f.inRadius === false ? "outside_area" : "unknown",
        bid_amount: f.bid,
        skill_match: f.skillMatch,
        recommendation_score: round1(score),
        recommendation_reason: reasons,
      };
    })
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, Math.min(Number(payload?.limit) || 8, 20));

  await db.from("ai_predictions").insert({
    job_id: jobId,
    model_name: "worker_recommendation",
    model_version: "v1",
    prediction: { recommendations, weights: { rating: 0.25, distance: 0.2, experience: 0.15, availability: 0.15, response: 0.1, completion: 0.1, bid: 0.05 } },
    confidence: recommendations.length ? recommendations[0].recommendation_score / 100 : null,
  });

  return json({
    job_id: jobId,
    service_category: category,
    candidates_evaluated: candidates.length,
    model: { name: "worker_recommendation", version: "v1" },
    recommendations,
  });
}

async function rankBids(db: any, userId: string, payload: any) {
  const jobId: string | undefined = payload?.job_id ?? payload?.service_request_id;
  if (!jobId) return err(400, "job_id is required");

  const { data: job } = await db
    .from("jobs")
    .select("id, customer_id, accepted_worker_id, category, latitude, longitude")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return err(404, "Service request not found");
  if (job.customer_id !== userId && job.accepted_worker_id !== userId) {
    return err(403, "You do not have access to this request");
  }

  const { data: bids } = await db
    .from("bids")
    .select("id, worker_id, amount, message, estimated_time, status, created_at")
    .eq("job_id", jobId);

  if (!bids || bids.length === 0) {
    return json({ job_id: jobId, ranked_bids: [], message: "No bids submitted yet." });
  }

  const { data: profiles } = await db
    .from("profiles")
    .select("user_id, full_name, rating, total_reviews, experience_years, latitude, longitude, is_verified")
    .in("user_id", bids.map((b: any) => b.worker_id));
  const pmap = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));

  const rows = bids.map((b: any) => {
    const p = pmap.get(b.worker_id);
    const distance =
      job.latitude != null && job.longitude != null && p?.latitude != null && p?.longitude != null
        ? round1(haversineKm(job.latitude, job.longitude, p.latitude, p.longitude))
        : null;
    return {
      bid: b,
      profile: p,
      distance,
      rating: p?.total_reviews ? p.rating : null,
      experience: p?.experience_years ?? null,
    };
  });

  const ratingS = normalise(rows.map((r) => r.rating));
  const distanceS = normalise(rows.map((r) => r.distance), true);
  const priceS = normalise(rows.map((r) => r.bid.amount), true);
  const expS = normalise(rows.map((r) => r.experience));

  const ranked = rows
    .map((r, i) => {
      const breakdown = {
        rating: round1(ratingS[i]),
        distance: round1(distanceS[i]),
        price: round1(priceS[i]),
        experience: round1(expS[i]),
      };
      const score =
        0.35 * breakdown.rating +
        0.25 * breakdown.distance +
        0.20 * breakdown.price +
        0.20 * breakdown.experience;
      return {
        bid_id: r.bid.id,
        worker_id: r.bid.worker_id,
        worker_name: r.profile?.full_name ?? "Worker",
        is_verified: !!r.profile?.is_verified,
        amount: r.bid.amount,
        rating: r.rating,
        total_reviews: r.profile?.total_reviews ?? 0,
        distance_km: r.distance,
        experience_years: r.experience,
        estimated_time: r.bid.estimated_time,
        status: r.bid.status,
        ai_score: round1(score),
        score_breakdown: breakdown,
      };
    })
    .sort((a, b) => b.ai_score - a.ai_score)
    .map((r, idx) => ({ ...r, ranking: idx + 1 }));

  await db.from("ai_predictions").insert({
    job_id: jobId,
    model_name: "bid_ranking",
    model_version: "v1",
    prediction: { ranked_bids: ranked, weights: { rating: 0.35, distance: 0.25, price: 0.2, experience: 0.2 } },
    confidence: ranked.length ? ranked[0].ai_score / 100 : null,
  });

  return json({
    job_id: jobId,
    model: { name: "bid_ranking", version: "v1" },
    weights: { rating: 35, distance: 25, price: 20, experience: 20 },
    ranked_bids: ranked,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "Method not allowed");

  try {
    const { user, status } = await requireUser(req);
    if (!user) return err(status, "Authentication required");

    let body: any;
    try {
      body = await req.json();
    } catch {
      return err(400, "Invalid JSON body");
    }
    const action = body?.action;
    const payload = body?.payload ?? {};
    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    switch (action) {
      case "recommend-workers":
        return await recommendWorkers(db, user.id, payload);
      case "rank-bids":
        return await rankBids(db, user.id, payload);
      default:
        return err(400, "Unknown action", { supported: ["recommend-workers", "rank-bids"] });
    }
  } catch (e) {
    console.error("ai-engine failure:", e);
    return err(500, "The AI service could not complete this request. Please try again.");
  }
});
