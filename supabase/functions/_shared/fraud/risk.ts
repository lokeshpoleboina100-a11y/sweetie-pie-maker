import type { FraudAnalysis } from "./types.ts";

export interface Thresholds {
  low_max: number;
  medium_max: number;
}

export type FraudStatus =
  | "passed"
  | "review"
  | "failed"
  | "duplicate_document"
  | "not_analyzed"
  | "error";

export interface RiskResult {
  score: number;
  riskLevel: "low" | "medium" | "high";
  fraudStatus: FraudStatus;
  /** Signals shown only to admins. */
  indicators: string[];
}

/**
 * Weighted risk model. Deliberately server-side only — never shipped to clients.
 *   quality + type match + OCR confidence + tampering + duplicate + name consistency
 */
export function computeRisk(
  a: FraudAnalysis,
  duplicateScore: number,
  t: Thresholds,
): RiskResult {
  const indicators: string[] = [];

  // Tampering (0..40)
  let score = a.tamperingScore * 40;
  if (a.tamperingScore >= 0.5) indicators.push("Manipulation indicators detected");

  // Authenticity (0..20)
  score += (1 - a.authenticityScore) * 20;

  // Document type mismatch (0..15)
  if (!a.documentTypeMatch) {
    score += 15;
    indicators.push(`Declared type does not match detected type (${a.detectedType})`);
  }

  // OCR confidence / readability (0..10)
  score += (1 - a.ocrConfidence) * 10;
  if (!a.quality.readable) {
    score += 5;
    indicators.push("Document not reliably readable");
  }

  // Capture quality (0..10)
  let quality = 0;
  if (a.quality.blurry) { quality += 4; indicators.push("Excessive blur"); }
  if (a.quality.glare) { quality += 2; indicators.push("Unusual glare"); }
  if (a.quality.cropped) { quality += 2; indicators.push("Document appears cropped"); }
  if (a.quality.screenshot) { quality += 3; indicators.push("Appears to be a screenshot"); }
  if (a.quality.photoOfScreen) { quality += 3; indicators.push("Appears to be a photo of a screen"); }
  score += Math.min(10, quality);

  // Duplicate reuse across accounts (0..25)
  score += duplicateScore * 25;
  if (duplicateScore >= 0.9) indicators.push("Identical document already submitted by another account");

  // Name consistency (0..8)
  if (a.nameMatchesAccount === false) {
    score += 8;
    indicators.push("Name on document differs from account name");
  }

  const finalScore = Math.round(Math.min(100, Math.max(0, score)));

  const riskLevel: RiskResult["riskLevel"] =
    finalScore <= t.low_max ? "low" : finalScore <= t.medium_max ? "medium" : "high";

  let fraudStatus: FraudStatus =
    riskLevel === "low" ? "passed" : riskLevel === "medium" ? "review" : "failed";

  // A duplicate never auto-fails on its own signal — it goes to a human.
  if (duplicateScore >= 0.9) fraudStatus = "duplicate_document";

  return { score: finalScore, riskLevel, fraudStatus, indicators };
}

export function userMessage(status: FraudStatus): string {
  switch (status) {
    case "passed":
      return "Your document passed the initial authenticity checks.";
    case "failed":
      return "We could not verify this document. Please upload a clear and valid document.";
    case "duplicate_document":
    case "review":
      return "Your document requires additional review.";
    default:
      return "Your document could not be checked right now. Our team will review it.";
  }
}
