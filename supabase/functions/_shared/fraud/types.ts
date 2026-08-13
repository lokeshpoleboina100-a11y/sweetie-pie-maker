// Provider abstraction for document fraud detection / identity verification.
// Swap implementations without touching the API surface or the frontend.

export type DocKind =
  | "aadhaar"
  | "pan"
  | "driving_licence"
  | "police_clearance"
  | "address_proof"
  | "skill_certificate"
  | "other";

export interface AnalyzeInput {
  /** Raw bytes of the uploaded document (image or pdf page). */
  bytes: Uint8Array;
  mimeType: string;
  /** Document type the user selected. */
  declaredType: DocKind;
  /** Name on the account, used for consistency checks (never logged). */
  accountName?: string | null;
}

export interface OcrFields {
  name?: string | null;
  /** Already masked by the provider, e.g. XXXXXX1234. */
  document_number_masked?: string | null;
  date_of_birth?: string | null;
  validity?: string | null;
}

export interface FraudAnalysis {
  /** 0..1 — how likely the document is an authentic, untampered capture. */
  authenticityScore: number;
  /** 0..1 — higher means more tampering indicators. */
  tamperingScore: number;
  /** 0..1 — OCR legibility / extraction confidence. */
  ocrConfidence: number;
  /** Does the image match the declared document type? */
  documentTypeMatch: boolean;
  detectedType: DocKind | "unknown";
  quality: {
    blurry: boolean;
    glare: boolean;
    cropped: boolean;
    screenshot: boolean;
    photoOfScreen: boolean;
    readable: boolean;
  };
  tamperingIndicators: string[];
  ocr: OcrFields;
  nameMatchesAccount?: boolean | null;
  notes?: string;
  /** Which provider produced this analysis. */
  provider: string;
}

export interface DocumentFraudProvider {
  readonly name: string;
  analyze(input: AnalyzeInput): Promise<FraudAnalysis>;
}

/**
 * Future hook for an authorized KYC/identity provider (UIDAI-authorised AUA/KUA,
 * NSDL PAN verification, etc.). AI image analysis never proves official validity.
 */
export interface IdentityVerificationProvider {
  readonly name: string;
  verify(input: {
    declaredType: DocKind;
    documentNumber: string;
    name?: string | null;
    dateOfBirth?: string | null;
  }): Promise<{ verified: boolean; reference?: string; message?: string }>;
}
