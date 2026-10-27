// NearWork — AI Problem Detection.
//
// Two clearly separated AI concerns:
//   action: "analyze"          -> COMPUTER VISION (CNN-class image classifier /
//                                 vision model). Classifies the visible problem
//                                 in a customer photo. It never creates images.
//   action: "reference-views"  -> GENERATIVE image model. Produces clearly
//                                 labelled AI reference illustrations to help a
//                                 customer understand a problem area they cannot
//                                 photograph. It never classifies.
//
// The vision model can be swapped for a self-hosted CNN endpoint by replacing
// runVisionAnalysis() only — the request/response contract stays the same.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const VISION_MODEL = "google/gemini-3.8-flash";
const IMAGE_MODEL = "google/gemini-3.1-flash-image";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// The ten job-posting categories the customer form actually offers. The vision
// model returns one of these ids so the form's category selector can be filled
// automatically (plus a service suggestion validated against the catalog).
const JOB_CATEGORY_IDS = [
  "home_services",
  "automotive",
  "technology",
  "education",
  "beauty_wellness",
  "moving_delivery",
  "gardening_outdoor",
  "pet_services",
  "events_creative",
  "professional_services",
] as const;

const JOB_CATEGORY_LABELS: Record<string, string> = {
  home_services: "Home Services",
  automotive: "Automotive",
  technology: "Technology",
  education: "Education",
  beauty_wellness: "Beauty & Wellness",
  moving_delivery: "Moving & Delivery",
  gardening_outdoor: "Gardening & Outdoor",
  pet_services: "Pet Services",
  events_creative: "Events & Creative",
  professional_services: "Professional Services",
};

const SERVICES_BY_CATEGORY: Record<string, string[]> = {
  home_services: ["Plumber", "Electrician", "AC Repair", "Cleaning", "Carpenter", "Painter", "Appliance Repair"],
  automotive: ["Car Repair", "Bike Repair", "Car Wash", "Tyre/Puncture Repair", "Battery Assistance", "Vehicle Servicing"],
  technology: ["Laptop Repair", "Mobile Repair", "CCTV Installation", "Wi-Fi/Router Setup", "Computer Support", "Software Installation"],
  education: ["Home Tutor", "Online Tutor", "Exam Coaching", "Language Classes", "Music Teacher", "Coding Teacher"],
  beauty_wellness: ["Salon at Home", "Makeup Artist", "Fitness Trainer", "Yoga Trainer", "Personal Grooming"],
  moving_delivery: ["Packers & Movers", "Local Delivery", "Loading/Unloading", "Furniture Moving", "Courier Assistance"],
  gardening_outdoor: ["Gardener", "Landscaping", "Lawn Care", "Tree Trimming", "Garden Maintenance"],
  pet_services: ["Pet Grooming", "Pet Walking", "Pet Sitting", "Pet Training"],
  events_creative: ["Photographer", "Videographer", "Event Decoration", "Catering", "DJ", "Event Planner"],
  professional_services: ["Accountant", "Graphic Designer", "Video Editor", "Digital Marketing", "Web Developer", "Legal/Documentation Assistance"],
};

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");

function matchService(categoryId: string, service: unknown): string | null {
  if (typeof service !== "string" || !service.trim()) return null;
  const list = SERVICES_BY_CATEGORY[categoryId] ?? [];
  const target = norm(service);
  return list.find((s) => norm(s) === target) ?? list.find((s) => norm(s).includes(target) || target.includes(norm(s))) ?? null;
}

async function gateway(path: string, body: unknown) {
  const res = await fetch(`https://ai.gateway.lovable.dev/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await res.text().catch(() => "");
    console.error(`AI gateway ${path} failed [${res.status}]: ${details}`);
    throw Object.assign(new Error("AI request failed"), {
      status: res.status,
      details,
    });
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// COMPUTER VISION: classify the visible problem in the uploaded photo.
// Replace this body with a call to a trained CNN endpoint to go fully custom.
// ---------------------------------------------------------------------------
async function runVisionAnalysis(imageDataUrl: string, hint?: string) {
  const data = await gateway("chat/completions", {
    model: VISION_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a home-services computer-vision inspector for NearWork, a job marketplace. " +
          "Look only at what is visible in the photo and: " +
          "1) identify the main object or appliance, 2) describe the visible damage or suspected problem, " +
          "3) pick the single best job category for hiring someone to fix it, 4) suggest one matching service " +
          "from the allowed services of that category, 5) write a short imperative job title (max 8 words, " +
          "e.g. 'Repair Leaking Kitchen Pipe', 'AC Inspection and Repair'), and 6) write a detailed job " +
          "description of 2-4 sentences covering the identified object, the visible damage or suspected " +
          "problem, the service required, and what information the customer should confirm with the " +
          "professional. Never claim an internal fault is definitively identified from an image alone — " +
          "distinguish visible observations from suspected causes. Give a calibrated confidence (0-1), a " +
          "one-sentence plain-English explanation a non-technical customer understands, and a normalised " +
          "bounding box (0-1, origin top-left) around the problem area. If the photo is unclear or shows " +
          "something unrelated to a bookable service, set needs_more_information true and keep confidence low " +
          "while still giving your best-guess category. " +
          "Allowed category ids and their services: " +
          JOB_CATEGORY_IDS.map((id) => `${id} (${SERVICES_BY_CATEGORY[id].join(", ")})`).join("; "),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: hint
              ? `Job context from the customer: ${hint}`.slice(0, 500)
              : "Analyze this photo and generate the job details.",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "problem_detection",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "detected_object",
            "visible_problem",
            "problem",
            "job_title",
            "description",
            "category_id",
            "service",
            "confidence",
            "needs_more_information",
            "explanation",
            "clear_enough",
            "region",
          ],
          properties: {
            detected_object: { type: "string" },
            visible_problem: { type: "string" },
            problem: { type: "string" },
            job_title: { type: "string" },
            description: { type: "string" },
            category_id: { type: "string", enum: JOB_CATEGORY_IDS as unknown as string[] },
            service: { type: "string" },
            confidence: { type: "number" },
            needs_more_information: { type: "boolean" },
            explanation: { type: "string" },
            clear_enough: { type: "boolean" },
            region: {
              type: "object",
              additionalProperties: false,
              required: ["x", "y", "width", "height"],
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
              },
            },
          },
        },
      },
    },
  });

  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Vision model returned no result");
  const parsed = JSON.parse(raw);

  const clamp01 = (n: unknown, fallback = 0) => {
    const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
    return Math.min(1, Math.max(0, v));
  };

  const categoryId = (JOB_CATEGORY_IDS as readonly string[]).includes(parsed.category_id)
    ? parsed.category_id
    : "home_services";
  const service = matchService(categoryId, parsed.service);
  const problem = String(parsed.problem ?? "Unclear problem");

  return {
    model: VISION_MODEL,
    problem,
    category: JOB_CATEGORY_LABELS[categoryId],
    categoryId,
    service,
    jobTitle: String(parsed.job_title ?? problem).slice(0, 120),
    description: String(parsed.description ?? ""),
    detectedObject: String(parsed.detected_object ?? ""),
    visibleProblem: String(parsed.visible_problem ?? problem),
    confidence: Math.round(clamp01(parsed.confidence) * 100),
    needsMoreInformation: parsed.needs_more_information === true,
    explanation: String(parsed.explanation ?? ""),
    clear_enough: parsed.clear_enough !== false,
    region: {
      x: clamp01(parsed.region?.x),
      y: clamp01(parsed.region?.y),
      width: clamp01(parsed.region?.width, 0.3) || 0.3,
      height: clamp01(parsed.region?.height, 0.3) || 0.3,
    },
  };
}

// ---------------------------------------------------------------------------
// GENERATIVE IMAGES: labelled reference illustrations (never real photographs).
// ---------------------------------------------------------------------------
const VIEW_BRIEFS = [
  { label: "Close-up reference", brief: "an extreme close-up of the damaged part" },
  {
    label: "Possible interior / problem area",
    brief: "a cutaway showing the likely hidden interior area behind the visible surface",
  },
  { label: "Different angle", brief: "the same problem area viewed from another angle" },
  {
    label: "Component illustration",
    brief: "a clean labelled diagram of the component that usually fails here",
  },
];

async function generateReferenceView(
  imageDataUrl: string,
  problem: string,
  category: string,
  view: { label: string; brief: string },
) {
  const data = await gateway("images/generations", {
    model: IMAGE_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Create an instructional illustration (clearly a drawing, not a photograph) showing ${view.brief} ` +
              `for this ${category} issue: ${problem}. Keep it clean, well lit, neutral background, ` +
              `easy for a non-technical homeowner to understand. No text overlays, no logos, no people.`,
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    modalities: ["image", "text"],
  });

  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return null;
  return {
    label: view.label,
    image: `data:image/png;base64,${b64}`,
    disclaimer: "AI-generated reference",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return json({ error: "AI is not configured for this project." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in to use AI features." }, 401);

    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return json({ error: "Please sign in to use AI features." }, 401);

    const { action, image, hint, problem, category, views } = await req.json();

    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return json({ error: "A photo is required." }, 400);
    }
    // ~8MB of base64 payload guard.
    if (image.length > 11_000_000) {
      return json({ error: "That photo is too large. Please use a smaller image." }, 400);
    }

    if (action === "analyze") {
      const result = await runVisionAnalysis(image, typeof hint === "string" ? hint : undefined);
      return json(result);
    }

    if (action === "reference-views") {
      const count = Math.min(Math.max(Number(views) || 3, 1), 4);
      const briefs = VIEW_BRIEFS.slice(0, count);
      const settled = await Promise.all(
        briefs.map((v) =>
          generateReferenceView(
            image,
            String(problem ?? "possible fault"),
            String(category ?? "Other"),
            v,
          ).catch((e) => {
            console.error(`Reference view "${v.label}" failed:`, e?.message ?? e);
            return null;
          }),
        ),
      );
      const images = settled.filter((v): v is NonNullable<typeof v> => v !== null);
      if (images.length === 0) {
        return json({ error: "AI could not generate reference views. Please try again." }, 502);
      }
      return json({ model: IMAGE_MODEL, images });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    const status = (e as { status?: number }).status;
    const details = (e as { details?: string }).details;
    console.error("problem-detection failed:", (e as Error).message, details ?? "");
    if (status === 429) {
      return json({ error: "The AI service is busy. Please try again in a moment." }, 429);
    }
    if (status === 402) {
      return json({ error: "AI credits are exhausted. Please add credits to continue." }, 402);
    }
    return json({ error: "The AI service is temporarily unavailable. Please try again." }, 500);
  }
});
