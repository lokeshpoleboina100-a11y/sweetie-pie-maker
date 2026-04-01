import { supabase } from '@/integrations/supabase/client';

export async function adminFetch(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, ...params }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Admin request failed');
  }

  return response.json();
}
