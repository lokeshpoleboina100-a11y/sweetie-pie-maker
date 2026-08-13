// POST /verification-analyze  (a.k.a. /api/verification/analyze-document)
//
// Runs AI fraud screening on an already-uploaded verification document.
// Never returns internal fraud signals to the worker.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LovableAiFraudProvider } from "../_shared/fraud/lovable-ai-provider.ts";
import { computeRisk, userMessage } from "../_shared/fraud/risk.ts";
import type { DocKind, DocumentFraudProvider } from "../_shared/fraud/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_TYPES: DocKind[] = [
  "aadhaar",
  "pan",
  "driving_licence",
  "police_clearance",
  "address_proof",
  "skill_certificate",
  "other",
];

const MAX_BYTES = 10 * 1024 * 1024;
const RATE_LIMIT_PER_HOUR = 6;

function normaliseType(t: string | null | undefined): DocKind {
  const v = (t ?? "").toLowerCase();
  if (ALLOWED_TYPES.includes(v as DocKind)) return v as DocKind;
  if (v === "id_proof") return "aadhaar";
  return "other";
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let documentId = "";
  try {
    // ---- auth ----------------------------------------------------------
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    // ---- input ---------------------------------------------------------
    const body = await req.json().catch(() => null);
    documentId = typeof body?.documentId === "string" ? body.documentId : "";
    if (!documentId) return json({ error: "documentId is required" }, 400);

    const { data: doc, error: docErr } = await admin
      .from("verification_documents")
      .select("id, user_id, document_type, storage_path, document_url, fraud_status")
      .eq("id", documentId)
      .maybeSingle();

    if (docErr || !doc) return json({ error: "Document not found" }, 404);
    if (doc.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    // ---- rate limit (per user, rolling hour) ----------------------------
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin
      .from("verification_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", user.id)
      .eq("action", "fraud_analysis")
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: "Too many analysis requests. Please try again later." }, 429);
    }

    // ---- settings ------------------------------------------------------
    const { data: settings } = await admin
      .from("fraud_detection_settings")
      .select("low_max, medium_max, enabled")
      .eq("id", true)
      .maybeSingle();

    if (settings && settings.enabled === false) {
      return json({ status: "review", message: userMessage("review") });
    }
    const thresholds = {
      low_max: settings?.low_max ?? 30,
      medium_max: settings?.medium_max ?? 70,
    };

    // ---- fetch the file from private storage ---------------------------
    const path: string | null = doc.storage_path ??
      (doc.document_url?.includes("/verification-docs/")
        ? doc.document_url.split("/verification-docs/")[1]?.split("?")[0] ?? null
        : null);
    if (!path) return json({ error: "Document file not available" }, 400);

    const { data: file, error: dlErr } = await admin.storage
      .from("verification-docs")
      .download(decodeURIComponent(path));
    if (dlErr || !file) return json({ error: "Document file not available" }, 400);

    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.byteLength === 0) return json({ error: "Document file is empty" }, 400);
    if (buf.byteLength > MAX_BYTES) return json({ error: "Document file too large" }, 400);

    const mimeType = file.type && file.type !== "application/octet-stream"
      ? file.type
      : path.toLowerCase().endsWith(".png")
        ? "image/png"
        : path.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "image/jpeg";

    // ---- duplicate detection via fingerprint ---------------------------
    const hash = await sha256Hex(buf);
    const { data: dupes } = await admin
      .from("verification_documents")
      .select("id, user_id")
      .eq("document_hash", hash)
      .neq("id", doc.id);
    const duplicateScore = (dupes ?? []).some((d: any) => d.user_id !== doc.user_id)
      ? 1
      : (dupes ?? []).length > 0
        ? 0.4
        : 0;

    // ---- provider analysis ---------------------------------------------
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Fraud analysis is not configured" }, 500);
    const provider: DocumentFraudProvider = new LovableAiFraudProvider(apiKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", doc.user_id)
      .maybeSingle();

    const analysis = await provider.analyze({
      bytes: buf,
      mimeType,
      declaredType: normaliseType(doc.document_type),
      accountName: profile?.full_name ?? null,
    });

    const risk = computeRisk(analysis, duplicateScore, thresholds);

    // ---- persist (no raw document data, numbers already masked) --------
    const verificationStatus =
      risk.fraudStatus === "passed" ? "pending" : risk.fraudStatus === "failed" ? "rejected" : "pending";

    await admin
      .from("verification_documents")
      .update({
        document_hash: hash,
        storage_path: path,
        fraud_status: risk.fraudStatus,
        fraud_score: risk.score,
        risk_level: risk.riskLevel,
        document_authenticity_score: analysis.authenticityScore,
        tampering_score: analysis.tamperingScore,
        ocr_confidence: analysis.ocrConfidence,
        document_type_match: analysis.documentTypeMatch,
        duplicate_score: duplicateScore,
        fraud_analyzed_at: new Date().toISOString(),
        status: verificationStatus,
        fraud_analysis_result: {
          provider: analysis.provider,
          detected_type: analysis.detectedType,
          quality: analysis.quality,
          tampering_indicators: analysis.tamperingIndicators,
          risk_indicators: risk.indicators,
          name_matches_account: analysis.nameMatchesAccount,
          ocr: analysis.ocr, // masked document number only
          notes: analysis.notes,
        },
      })
      .eq("id", doc.id);

    await admin.from("verification_audit_log").insert({
      document_id: doc.id,
      actor_id: user.id,
      action: "fraud_analysis",
      detail: {
        fraud_status: risk.fraudStatus,
        risk_level: risk.riskLevel,
        score: risk.score,
        provider: analysis.provider,
      },
    });

    // ---- client-safe response ------------------------------------------
    return json({
      status: risk.fraudStatus === "duplicate_document" ? "review" : risk.fraudStatus,
      riskLevel: risk.riskLevel,
      riskScore: risk.score,
      documentTypeMatch: analysis.documentTypeMatch,
      message: userMessage(risk.fraudStatus),
    });
  } catch (err) {
    const status = (err as any)?.status;
    // Never log document contents or personal data.
    console.error("verification-analyze failed", { documentId, status, name: (err as Error)?.name });

    if (documentId) {
      await admin
        .from("verification_documents")
        .update({ fraud_status: "error", fraud_analyzed_at: new Date().toISOString() })
        .eq("id", documentId);
    }
    if (status === 429) return json({ error: "AI service is busy. Please retry shortly." }, 429);
    if (status === 402) return json({ error: "AI credits exhausted. Please contact support." }, 402);
    return json({ status: "review", message: userMessage("error") }, 200);
  }
});
