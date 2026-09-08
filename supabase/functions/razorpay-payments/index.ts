// Razorpay escrow payments for NearWork.
// Actions: create-order | verify | release | refund | status
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const RZP_KEY = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RZP_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const COMMISSION_RATE = 0.1;

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create-order'), jobId: z.string().uuid() }),
  z.object({
    action: z.literal('verify'),
    razorpay_order_id: z.string().min(4).max(120),
    razorpay_payment_id: z.string().min(4).max(120),
    razorpay_signature: z.string().min(10).max(256),
  }),
  z.object({ action: z.literal('release'), paymentId: z.string().uuid() }),
  z.object({
    action: z.literal('refund'),
    paymentId: z.string().uuid(),
    reason: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal('status'), jobId: z.string().uuid() }),
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function rzpHeaders() {
  return {
    Authorization: 'Basic ' + btoa(`${RZP_KEY}:${RZP_SECRET}`),
    'Content-Type': 'application/json',
  };
}

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

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!RZP_KEY || !RZP_SECRET) {
      return json({ error: 'Payment gateway is not configured yet.' }, 503);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
    const user = userData.user;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---------- create-order: customer funds escrow ----------
    if (body.action === 'create-order') {
      const { data: job } = await admin
        .from('jobs')
        .select('id, title, customer_id, accepted_worker_id, budget_max, budget_min, status')
        .eq('id', body.jobId)
        .maybeSingle();

      if (!job) return json({ error: 'Job not found' }, 404);
      if (job.customer_id !== user.id) return json({ error: 'Only the job owner can pay' }, 403);
      if (!job.accepted_worker_id) return json({ error: 'Accept a bid before paying' }, 400);

      // Amount comes from the accepted bid when available, never from the client.
      const { data: bid } = await admin
        .from('bids')
        .select('amount')
        .eq('job_id', job.id)
        .eq('worker_id', job.accepted_worker_id)
        .eq('status', 'accepted')
        .maybeSingle();

      const base = bid?.amount ?? job.budget_max ?? job.budget_min ?? 0;
      if (base <= 0) return json({ error: 'No agreed amount for this job yet' }, 400);
      const commission = Math.round(base * COMMISSION_RATE);
      const total = base + commission;

      const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: rzpHeaders(),
        body: JSON.stringify({
          amount: total * 100,
          currency: 'INR',
          receipt: `job_${job.id.slice(0, 30)}`,
          notes: { job_id: job.id, customer_id: user.id, worker_id: job.accepted_worker_id },
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        console.error('razorpay order failed', order);
        return json({ error: order?.error?.description ?? 'Could not start the payment' }, 502);
      }

      const { data: payment, error: insErr } = await admin
        .from('payments')
        .insert({
          job_id: job.id,
          customer_id: user.id,
          worker_id: job.accepted_worker_id,
          amount: base,
          commission,
          payment_method: 'razorpay',
          status: 'pending',
          razorpay_order_id: order.id,
        })
        .select('id')
        .single();
      if (insErr) {
        console.error('payment insert failed', insErr);
        return json({ error: 'Could not record the payment' }, 500);
      }

      return json({
        keyId: RZP_KEY,
        orderId: order.id,
        amount: total * 100,
        currency: 'INR',
        paymentId: payment.id,
        breakdown: { base, commission, total },
        jobTitle: job.title,
      });
    }

    // ---------- verify: signature check, then hold in escrow ----------
    if (body.action === 'verify') {
      const expected = await hmacHex(
        RZP_SECRET,
        `${body.razorpay_order_id}|${body.razorpay_payment_id}`,
      );
      if (!timingSafeEqual(expected, body.razorpay_signature)) {
        return json({ error: 'Payment signature check failed' }, 400);
      }

      const { data: payment } = await admin
        .from('payments')
        .select('id, job_id, customer_id, worker_id, amount, commission, status')
        .eq('razorpay_order_id', body.razorpay_order_id)
        .maybeSingle();
      if (!payment) return json({ error: 'Payment not found' }, 404);
      if (payment.customer_id !== user.id) return json({ error: 'Forbidden' }, 403);

      if (payment.status === 'pending') {
        // Confirm with Razorpay that the payment really was captured.
        const payRes = await fetch(
          `https://api.razorpay.com/v1/payments/${body.razorpay_payment_id}`,
          { headers: rzpHeaders() },
        );
        const pay = await payRes.json();
        if (!payRes.ok || !['captured', 'authorized'].includes(pay.status)) {
          return json({ error: 'Payment was not captured' }, 400);
        }

        await admin
          .from('payments')
          .update({ status: 'completed', razorpay_payment_id: body.razorpay_payment_id })
          .eq('id', payment.id);

        // Money is now held in escrow for this job.
        await admin.from('escrow_transactions').insert({
          job_id: payment.job_id,
          customer_id: payment.customer_id,
          worker_id: payment.worker_id,
          type: 'fund',
          amount: payment.amount,
          notes: `Razorpay ${body.razorpay_payment_id}`,
        });

        await admin.from('jobs').update({ status: 'in_progress' }).eq('id', payment.job_id);
      }

      return json({ ok: true, paymentId: payment.id, status: 'completed' });
    }

    // ---------- release: customer releases escrow to worker ----------
    if (body.action === 'release') {
      const { data: payment } = await admin
        .from('payments')
        .select('id, job_id, customer_id, worker_id, amount, status, released_at')
        .eq('id', body.paymentId)
        .maybeSingle();
      if (!payment) return json({ error: 'Payment not found' }, 404);
      if (payment.customer_id !== user.id) return json({ error: 'Forbidden' }, 403);
      if (payment.status !== 'completed') return json({ error: 'Nothing to release' }, 400);
      if (payment.released_at) return json({ ok: true, alreadyReleased: true });

      await admin.from('escrow_transactions').insert({
        job_id: payment.job_id,
        customer_id: payment.customer_id,
        worker_id: payment.worker_id,
        type: 'release',
        amount: payment.amount,
        notes: 'Released by customer',
      });
      await admin
        .from('payments')
        .update({ released_at: new Date().toISOString() })
        .eq('id', payment.id);
      await admin.from('jobs').update({ status: 'completed' }).eq('id', payment.job_id);

      return json({ ok: true, released: payment.amount });
    }

    // ---------- refund: money back to the customer ----------
    if (body.action === 'refund') {
      const { data: payment } = await admin
        .from('payments')
        .select(
          'id, job_id, customer_id, worker_id, amount, commission, status, razorpay_payment_id, released_at, refunded_amount',
        )
        .eq('id', body.paymentId)
        .maybeSingle();
      if (!payment) return json({ error: 'Payment not found' }, 404);

      const { data: isAdmin } = await admin.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      if (payment.customer_id !== user.id && !isAdmin) return json({ error: 'Forbidden' }, 403);
      if (payment.status !== 'completed') return json({ error: 'This payment cannot be refunded' }, 400);
      if (payment.released_at && !isAdmin) {
        return json({ error: 'This job was already paid out to the worker' }, 400);
      }
      if (!payment.razorpay_payment_id) {
        return json({ error: 'No gateway payment to refund' }, 400);
      }

      const refundable = payment.amount + payment.commission - (payment.refunded_amount ?? 0);
      if (refundable <= 0) return json({ error: 'Already fully refunded' }, 400);

      const refundRes = await fetch(
        `https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`,
        {
          method: 'POST',
          headers: rzpHeaders(),
          body: JSON.stringify({
            amount: refundable * 100,
            speed: 'normal',
            notes: { job_id: payment.job_id, reason: body.reason ?? 'Customer refund' },
          }),
        },
      );
      const refund = await refundRes.json();
      if (!refundRes.ok) {
        console.error('refund failed', refund);
        return json({ error: refund?.error?.description ?? 'Refund could not be started' }, 502);
      }

      await admin.from('escrow_transactions').insert({
        job_id: payment.job_id,
        customer_id: payment.customer_id,
        worker_id: payment.worker_id,
        type: 'refund',
        amount: payment.amount,
        notes: body.reason ?? 'Refunded to customer',
      });
      await admin
        .from('payments')
        .update({
          status: 'refunded',
          razorpay_refund_id: refund.id,
          refunded_amount: (payment.refunded_amount ?? 0) + refundable,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      await admin.from('jobs').update({ status: 'cancelled' }).eq('id', payment.job_id);

      return json({ ok: true, refundId: refund.id, amount: refundable });
    }

    // ---------- status ----------
    const { data: job } = await admin
      .from('jobs')
      .select('id, customer_id, accepted_worker_id, escrow_balance')
      .eq('id', body.jobId)
      .maybeSingle();
    if (!job) return json({ error: 'Job not found' }, 404);
    if (job.customer_id !== user.id && job.accepted_worker_id !== user.id) {
      return json({ error: 'Forbidden' }, 403);
    }
    const { data: payments } = await admin
      .from('payments')
      .select('id, amount, commission, status, released_at, refunded_at, refunded_amount, created_at')
      .eq('job_id', job.id)
      .order('created_at', { ascending: false });

    return json({ escrowBalance: job.escrow_balance, payments: payments ?? [] });
  } catch (err) {
    console.error('razorpay-payments error', err);
    return json({ error: 'Something went wrong' }, 500);
  }
});
