import { supabase } from '@/integrations/supabase/client';

/**
 * Frontend AI service layer. The UI never touches the scoring logic or the
 * database directly — it calls the ai-engine endpoint, which authenticates the
 * caller, computes scores from live data and stores the prediction.
 */

export interface RecommendedWorker {
  worker_id: string;
  worker_name: string;
  distance_km: number | null;
  rating: number | null;
  total_reviews: number;
  experience_years: number | null;
  is_verified: boolean;
  location_name: string | null;
  availability: 'available_in_area' | 'outside_area' | 'unknown';
  bid_amount: number | null;
  skill_match: boolean;
  recommendation_score: number;
  recommendation_reason: string[];
}

export interface RankedBid {
  bid_id: string;
  worker_id: string;
  worker_name: string;
  is_verified: boolean;
  amount: number;
  rating: number | null;
  total_reviews: number;
  distance_km: number | null;
  experience_years: number | null;
  estimated_time: string | null;
  status: string;
  ai_score: number;
  ranking: number;
  score_breakdown: {
    rating: number;
    distance: number;
    price: number;
    experience: number;
  };
}

const FRIENDLY_ERRORS: Record<number, string> = {
  400: 'That request was not valid. Please try again.',
  401: 'Please sign in again to use AI features.',
  403: 'You do not have access to this AI result.',
  404: 'This service request could not be found.',
  429: 'The AI service is busy. Please try again in a moment.',
  500: 'The AI service is temporarily unavailable. Please try again.',
};

async function callAiEngine<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-engine', {
    body: { action, payload },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    throw new Error((status && FRIENDLY_ERRORS[status]) || FRIENDLY_ERRORS[500]);
  }
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export function recommendWorkers(jobId: string) {
  return callAiEngine<{
    job_id: string;
    service_category: string;
    candidates_evaluated?: number;
    recommendations: RecommendedWorker[];
    message?: string;
  }>('recommend-workers', { job_id: jobId });
}

export function rankBids(jobId: string) {
  return callAiEngine<{
    job_id: string;
    weights?: Record<string, number>;
    ranked_bids: RankedBid[];
    message?: string;
  }>('rank-bids', { job_id: jobId });
}
