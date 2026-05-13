// AI Marketplace edge function — multi-action AI helper using Lovable AI Gateway
// Actions: generate_proposal | match_workers | extract_skills | detect_fraud | recommend_jobs
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callAI(messages: any[], opts: { json?: boolean } = {}) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (res.status === 429) throw new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (res.status === 402) throw new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!res.ok) throw new Response(JSON.stringify({ error: `AI gateway error: ${res.status}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function ok(data: any) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, payload } = await req.json();

    switch (action) {
      case "generate_proposal": {
        const { job, worker } = payload;
        const sys = "You are an expert proposal writer for freelance marketplaces. Write a concise, professional bid proposal in 80-120 words. Be specific, friendly, and confident. No emojis. No markdown. First person.";
        const usr = `Job: ${job.title}\nCategory: ${job.category}\nDescription: ${job.description}\nBudget: ₹${job.budget_max || job.budget_min}\nLocation: ${job.location_name || "local"}\n\nMy profile:\nName: ${worker.full_name}\nSkills: ${(worker.skills || []).join(", ")}\nExperience: ${worker.experience_years || 0} years\nRating: ${worker.rating || "new"} (${worker.total_jobs_completed || 0} jobs)\nBio: ${worker.bio || "Skilled professional."}\n\nWrite the proposal.`;
        const text = await callAI([{ role: "system", content: sys }, { role: "user", content: usr }]);
        return ok({ proposal: text.trim() });
      }

      case "match_workers": {
        const { job, workers } = payload;
        const sys = "You rank freelancers for a job. Return strict JSON: {\"matches\":[{\"worker_id\":string,\"score\":0-100,\"reason\":string}]}. Score on skill fit, experience, rating, and proximity. Only include top 5.";
        const usr = `Job: ${JSON.stringify({ title: job.title, category: job.category, description: job.description, budget: job.budget_max })}\n\nWorkers:\n${workers.slice(0, 30).map((w: any) => `- id=${w.user_id} name=${w.full_name} skills=${(w.skills || []).join("/")} exp=${w.experience_years || 0}y rating=${w.rating || 0} jobs=${w.total_jobs_completed || 0} loc=${w.location_name || "?"}`).join("\n")}`;
        const text = await callAI([{ role: "system", content: sys }, { role: "user", content: usr }], { json: true });
        return ok(JSON.parse(text));
      }

      case "extract_skills": {
        const { bio } = payload;
        const categories = ["plumber", "electrician", "carpenter", "painter", "cleaner", "mover", "mechanic", "tutor", "designer", "developer", "photographer", "delivery", "cook", "gardener", "tailor", "beautician", "driver", "other"];
        const sys = `Extract relevant skill tags from a freelancer bio. Return strict JSON: {"skills":["tag1","tag2"]}. Use only these categories: ${categories.join(", ")}. Max 5.`;
        const text = await callAI([{ role: "system", content: sys }, { role: "user", content: bio }], { json: true });
        return ok(JSON.parse(text));
      }

      case "detect_fraud": {
        const { profile } = payload;
        const sys = "Detect spam/fake freelancer profiles. Return strict JSON: {\"risk\":\"low|medium|high\",\"score\":0-100,\"flags\":[string]}. Flags: gibberish_bio, suspicious_name, unrealistic_claims, contact_info_in_bio, copy_paste, none.";
        const usr = `Name: ${profile.full_name}\nBio: ${profile.bio || ""}\nSkills: ${(profile.skills || []).join(",")}\nExperience: ${profile.experience_years || 0}y\nLocation: ${profile.location_name || ""}`;
        const text = await callAI([{ role: "system", content: sys }, { role: "user", content: usr }], { json: true });
        return ok(JSON.parse(text));
      }

      case "recommend_jobs": {
        const { worker, jobs } = payload;
        const sys = "Recommend the best jobs for a freelancer. Return strict JSON: {\"recommendations\":[{\"job_id\":string,\"score\":0-100,\"reason\":string}]}. Top 5 only.";
        const usr = `Worker: skills=${(worker.skills || []).join(",")} exp=${worker.experience_years}y rating=${worker.rating} loc=${worker.location_name}\n\nOpen jobs:\n${jobs.slice(0, 30).map((j: any) => `- id=${j.id} title=${j.title} cat=${j.category} budget=${j.budget_max} loc=${j.location_name}`).join("\n")}`;
        const text = await callAI([{ role: "system", content: sys }, { role: "user", content: usr }], { json: true });
        return ok(JSON.parse(text));
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("ai-marketplace error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
