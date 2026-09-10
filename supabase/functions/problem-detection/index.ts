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

const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "AC / Cooling",
  "Appliance",
  "Wall / Structural",
  "Water Leakage",
  "Other",
] as const;

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
          "You are a home-services computer-vision inspector for NearWork. " +
          "Look only at what is visible in the photo. Classify the most likely " +
          "physical problem, give a calibrated confidence (0-1), a one-sentence " +
          "plain-English explanation a non-technical customer understands, and a " +
          "normalised bounding box (0-1, origin top-left) around the problem area. " +
          "If the photo is too unclear to judge, say so, set clear_enough to false " +
          "and keep confidence low.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: hint
              ? `Job context from the customer: ${hint}`.slice(0, 500)
              : "Identify the visible problem.",
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
            "problem",
            "category",
            "confidence",
            "explanation",
            "clear_enough",
            "region",
          ],
          properties: {
            problem: { type: "string" },
            category: { type: "string", enum: CATEGORIES as unknown as string[] },
            confidence: { type: "number" },
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

  return {
    model: VISION_MODEL,
    problem: String(parsed.problem ?? "Unclear problem"),
    category: CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
    confidence: Math.round(clamp01(parsed.confidence) * 100),
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
