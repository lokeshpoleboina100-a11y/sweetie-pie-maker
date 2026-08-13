import type {
  AnalyzeInput,
  DocKind,
  DocumentFraudProvider,
  FraudAnalysis,
} from "./types.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const TYPE_HINTS: Record<DocKind, string> = {
  aadhaar: "Indian Aadhaar card (UIDAI): 12-digit number in 4-4-4 groups, Government of India emblem, QR code.",
  pan: "Indian PAN card (Income Tax Dept): 10-character alphanumeric PAN, name, father's name, DOB, signature.",
  driving_licence: "Indian Driving Licence: DL number, validity dates, vehicle classes, issuing RTO.",
  police_clearance: "Police Clearance Certificate: official letterhead, seal, signature, reference number.",
  address_proof: "Address proof document (utility bill, passport, voter ID, rent agreement).",
  skill_certificate: "Skill/training certificate from an institute with candidate name and course.",
  other: "Any government or official identity document.",
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function mask(value?: string | null): string | null {
  if (!value) return null;
  const clean = value.replace(/\s+/g, "");
  if (clean.length <= 4) return "X".repeat(clean.length);
  return "X".repeat(clean.length - 4) + clean.slice(-4);
}

function clamp01(n: unknown, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "detected_type",
    "document_type_match",
    "authenticity_score",
    "tampering_score",
    "ocr_confidence",
    "quality",
    "tampering_indicators",
    "ocr",
  ],
  properties: {
    detected_type: {
      type: "string",
      enum: [
        "aadhaar",
        "pan",
        "driving_licence",
        "police_clearance",
        "address_proof",
        "skill_certificate",
        "other",
        "unknown",
      ],
    },
    document_type_match: { type: "boolean" },
    authenticity_score: { type: "number" },
    tampering_score: { type: "number" },
    ocr_confidence: { type: "number" },
    quality: {
      type: "object",
      additionalProperties: false,
      required: ["blurry", "glare", "cropped", "screenshot", "photo_of_screen", "readable"],
      properties: {
        blurry: { type: "boolean" },
        glare: { type: "boolean" },
        cropped: { type: "boolean" },
        screenshot: { type: "boolean" },
        photo_of_screen: { type: "boolean" },
        readable: { type: "boolean" },
      },
    },
    tampering_indicators: { type: "array", items: { type: "string" } },
    ocr: {
      type: "object",
      additionalProperties: false,
      required: ["name", "document_number", "date_of_birth", "validity"],
      properties: {
        name: { type: ["string", "null"] },
        document_number: { type: ["string", "null"] },
        date_of_birth: { type: ["string", "null"] },
        validity: { type: ["string", "null"] },
      },
    },
    notes: { type: "string" },
  },
} as const;

/**
 * Vision-based fraud screening via Lovable AI. This estimates whether a document
 * *appears* manipulated — it never asserts official government validity.
 */
export class LovableAiFraudProvider implements DocumentFraudProvider {
  readonly name = "lovable-ai-vision";

  constructor(private apiKey: string) {}

  async analyze(input: AnalyzeInput): Promise<FraudAnalysis> {
    const dataUrl = `data:${input.mimeType};base64,${toBase64(input.bytes)}`;

    const system = [
      "You are a document fraud screening analyst for an Indian marketplace.",
      "Assess image quality, whether the image matches the declared document type, and any signs of digital manipulation",
      "(edited or replaced text, mismatched fonts, misaligned baselines, copy-paste regions, edited photo,",
      "inconsistent background/noise, compression artifacts around text).",
      "Extract only: name, document number, date of birth, validity. Never invent values.",
      "You cannot prove authenticity; return calibrated risk estimates only.",
      "Scores are 0..1. authenticity_score high = looks like a genuine untampered capture.",
      "tampering_score high = strong manipulation indicators.",
      "Respond with JSON matching the schema exactly.",
    ].join(" ");

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": this.apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Declared document type: ${input.declaredType}. Expected characteristics: ${TYPE_HINTS[input.declaredType] ?? TYPE_HINTS.other}` +
                  (input.accountName ? `\nAccount holder name: ${input.accountName}` : ""),
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "fraud_analysis", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (!res.ok) {
      const status = res.status;
      throw Object.assign(new Error(`ai_gateway_error_${status}`), { status });
    }

    const payload = await res.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      parsed = {};
    }

    const q = parsed.quality ?? {};
    const ocrName: string | null = parsed?.ocr?.name ?? null;
    const accountName = input.accountName?.trim().toLowerCase() ?? "";
    const extracted = (ocrName ?? "").trim().toLowerCase();
    const nameMatchesAccount = accountName && extracted
      ? extracted.includes(accountName.split(" ")[0]) || accountName.includes(extracted.split(" ")[0])
      : null;

    return {
      authenticityScore: clamp01(parsed.authenticity_score, 0.5),
      tamperingScore: clamp01(parsed.tampering_score, 0.5),
      ocrConfidence: clamp01(parsed.ocr_confidence, 0.5),
      documentTypeMatch: parsed.document_type_match !== false,
      detectedType: (parsed.detected_type ?? "unknown") as DocKind | "unknown",
      quality: {
        blurry: !!q.blurry,
        glare: !!q.glare,
        cropped: !!q.cropped,
        screenshot: !!q.screenshot,
        photoOfScreen: !!q.photo_of_screen,
        readable: q.readable !== false,
      },
      tamperingIndicators: Array.isArray(parsed.tampering_indicators)
        ? parsed.tampering_indicators.slice(0, 12).map((s: unknown) => String(s).slice(0, 160))
        : [],
      ocr: {
        name: ocrName,
        // Never persist a full document number.
        document_number_masked: mask(parsed?.ocr?.document_number),
        date_of_birth: parsed?.ocr?.date_of_birth ?? null,
        validity: parsed?.ocr?.validity ?? null,
      },
      nameMatchesAccount,
      notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 600) : undefined,
      provider: this.name,
    };
  }
}
