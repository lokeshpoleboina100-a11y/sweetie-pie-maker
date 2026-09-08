// Razorpay webhook: keeps payments in sync even if the browser closes mid-payment.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  if (!WEBHOOK_SECRET) return new Response('Not configured', { status: 503, headers: corsHeaders });
  const expected = await hmacHex(WEBHOOK_SECRET, raw);
  if (!safeEqual(expected, signature)) {
    return new Response('Invalid signature', { status: 401, headers: corsHeaders });
  }

  const event = JSON.parse(raw);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const entity = event?.payload?.payment?.entity;
    const orderId = entity?.order_id;

    if (event.event === 'payment.captured' && orderId) {
      const { data: payment } = await admin
        .from('payments')
        .select('id, job_id, customer_id, worker_id, amount, status')
        .eq('razorpay_order_id', orderId)
        .maybeSingle();
      if (payment && payment.status === 'pending') {
        await admin
          .from('payments')
          .update({ status: 'completed', razorpay_payment_id: entity.id })
          .eq('id', payment.id);
        await admin.from('escrow_transactions').insert({
          job_id: payment.job_id,
          customer_id: payment.customer_id,
          worker_id: payment.worker_id,
          type: 'fund',
          amount: payment.amount,
          notes: `Razorpay webhook ${entity.id}`,
        });
        await admin.from('jobs').update({ status: 'in_progress' }).eq('id', payment.job_id);
      }
    }

    if (event.event === 'payment.failed' && orderId) {
      await admin
        .from('payments')
        .update({ status: 'failed' })
        .eq('razorpay_order_id', orderId)
        .eq('status', 'pending');
    }

    if (event.event === 'refund.processed') {
      const refund = event?.payload?.refund?.entity;
      if (refund?.payment_id) {
        await admin
          .from('payments')
          .update({ status: 'refunded', razorpay_refund_id: refund.id, refunded_at: new Date().toISOString() })
          .eq('razorpay_payment_id', refund.payment_id);
      }
    }
  } catch (err) {
    console.error('webhook handling failed', err);
    return new Response('error', { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
