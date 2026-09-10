import { supabase } from '@/integrations/supabase/client';

/**
 * AI Problem Detection service layer.
 *
 * Two distinct AI components live behind this module, and they must not be
 * confused with one another:
 *
 *  1. Computer vision (CNN-class image classifier) — `analyzeProblemPhoto()`.
 *     Takes a customer photo and classifies the visible problem. It does NOT
 *     create images. Swapping in a self-hosted/trained CNN only requires
 *     changing the backing endpoint; this signature stays stable.
 *
 *  2. Generative image model — `generateReferenceViews()`. Produces clearly
 *     labelled AI reference illustrations for problem areas that cannot be
 *     photographed. These are never real photographs.
 */

export const PROBLEM_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'AC / Cooling',
  'Appliance',
  'Wall / Structural',
  'Water Leakage',
  'Other',
] as const;

export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];

/** Normalised (0..1) box around the detected problem area, origin top-left. */
export interface ProblemRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionAnalysis {
  /** Identifier of the vision component that produced this result. */
  model: string;
  problem: string;
  category: ProblemCategory;
  /** 0-100 */
  confidence: number;
  explanation: string;
  /** False when the photo is too unclear for a reliable classification. */
  clear_enough: boolean;
  region: ProblemRegion;
}

export interface ReferenceView {
  label: string;
  /** Data URL of the generated illustration. */
  image: string;
  /** Always shown next to the image — these are not real photographs. */
  disclaimer: string;
}

const FRIENDLY_ERRORS: Record<number, string> = {
  400: 'That photo could not be used. Please try another one.',
  401: 'Please sign in again to use AI features.',
  402: 'AI credits are exhausted. Please add credits to continue.',
  429: 'The AI service is busy. Please try again in a moment.',
  500: 'The AI service is temporarily unavailable. Please try again.',
  502: 'AI could not finish this request. Please try again.',
};

async function callDetection<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('problem-detection', { body });

  if (error) {
    const ctx = (error as { context?: { status?: number; text?: () => Promise<string> } }).context;
    let message: string | undefined;
    try {
      const raw = await ctx?.text?.();
      if (raw) message = JSON.parse(raw)?.error;
    } catch {
      /* fall back to the status-based message */
    }
    throw new Error(message || FRIENDLY_ERRORS[ctx?.status ?? 500] || FRIENDLY_ERRORS[500]);
  }
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

/** Computer-vision classification of the visible problem in a photo. */
export function analyzeProblemPhoto(input: { image: string; hint?: string }) {
  return callDetection<VisionAnalysis>({
    action: 'analyze',
    image: input.image,
    hint: input.hint,
  });
}

/** Generative AI reference illustrations for a problem that can't be photographed. */
export function generateReferenceViews(input: {
  image: string;
  problem: string;
  category: string;
  views?: number;
}) {
  return callDetection<{ model: string; images: ReferenceView[] }>({
    action: 'reference-views',
    image: input.image,
    problem: input.problem,
    category: input.category,
    views: input.views ?? 3,
  });
}

/** Sentence appended to the job description when the customer accepts a result. */
export function buildDescriptionLine(analysis: VisionAnalysis): string {
  return `${analysis.problem} detected by AI (${analysis.confidence}% confidence). Please inspect the affected area.`;
}

/** Shrinks a picked/captured file to a data URL small enough for the AI request. */
export function fileToAnalysisDataUrl(file: File, maxEdge = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('This browser cannot process the image.'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
