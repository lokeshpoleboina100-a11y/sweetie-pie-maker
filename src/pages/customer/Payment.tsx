import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Lock,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type DbJob = Tables<'jobs'>;

interface PaymentRow {
  id: string;
  amount: number;
  commission: number;
  status: string;
  released_at: string | null;
  refunded_at: string | null;
  refunded_amount: number;
  created_at: string;
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function Payment() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [job, setJob] = useState<DbJob | null>(null);
  const [workerName, setWorkerName] = useState('Worker');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | 'pay' | 'release' | 'refund'>(null);
  const [escrowBalance, setEscrowBalance] = useState(0);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('razorpay-payments', { body: payload });
    if (error) {
      let message = error.message;
      try {
        const ctx = (error as any).context;
        if (ctx?.json) message = (await ctx.json())?.error ?? message;
      } catch { /* keep default message */ }
      throw new Error(typeof message === 'string' ? message : 'Payment service error');
    }
    if ((data as any)?.error) throw new Error(String((data as any).error));
    return data as any;
  }, []);

  const refresh = useCallback(async () => {
    if (!jobId) return;
    const { data: jobData } = await supabase.from('jobs').select('*').eq('id', jobId).maybeSingle();
    setJob(jobData ?? null);
    if (jobData?.accepted_worker_id) {
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', jobData.accepted_worker_id)
        .maybeSingle();
      if (p) setWorkerName(p.full_name);
    }
    try {
      const status = await call({ action: 'status', jobId });
      setEscrowBalance(status.escrowBalance ?? 0);
      setPayments(status.payments ?? []);
    } catch {
      setEscrowBalance(jobData?.escrow_balance ?? 0);
    }
    setLoading(false);
  }, [jobId, call]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activePayment = payments.find((p) => p.status === 'completed' && !p.released_at);
  const settled = payments.find((p) => p.released_at);
  const refunded = payments.find((p) => p.status === 'refunded');

  const base = activePayment?.amount ?? job?.budget_max ?? job?.budget_min ?? 0;
  const commission = activePayment?.commission ?? Math.round(base * 0.1);
  const total = base + commission;

  const handlePay = async () => {
    setBusy('pay');
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load the payment window. Check your connection.');

      const order = await call({ action: 'create-order', jobId });

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: 'NearWork',
          description: order.jobTitle,
          prefill: { name: profile?.full_name ?? '' },
          theme: { color: '#6366f1' },
          handler: async (res: any) => {
            try {
              await call({
                action: 'verify',
                razorpay_order_id: res.razorpay_order_id,
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_signature: res.razorpay_signature,
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
        rzp.open();
      });

      toast({
        title: 'Payment held safely',
        description: `₹${total.toLocaleString('en-IN')} is held for this job until you release it.`,
      });
      await refresh();
    } catch (err) {
      toast({
        title: 'Payment not completed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleRelease = async () => {
    if (!activePayment) return;
    setBusy('release');
    try {
      await call({ action: 'release', paymentId: activePayment.id });
      toast({ title: 'Money released', description: `${workerName} has been paid.` });
      await refresh();
    } catch (err) {
      toast({
        title: 'Could not release',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleRefund = async () => {
    if (!activePayment) return;
    setBusy('refund');
    try {
      const res = await call({ action: 'refund', paymentId: activePayment.id });
      toast({
        title: 'Refund started',
        description: `₹${Number(res.amount).toLocaleString('en-IN')} is on its way back to you.`,
      });
      await refresh();
    } catch (err) {
      toast({
        title: 'Refund failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Payment" showBack />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!job) return <div className="p-8 text-center">Job not found</div>;

  const isOwner = user?.id === job.customer_id;

  return (
    <div className="min-h-screen bg-background pb-10">
      <AppHeader title="Payment" showBack />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Payment summary</h3>
          <h2 className="text-lg font-extrabold mb-1">{job.title}</h2>
          <p className="text-sm text-muted-foreground mb-4">Worker: {workerName}</p>
          <Separator className="my-3" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service amount</span>
              <span className="font-semibold">₹{base.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform fee (10%)</span>
              <span className="font-semibold">₹{commission.toLocaleString('en-IN')}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base">
              <span className="font-bold">Total</span>
              <span className="font-extrabold text-primary text-xl">
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </Card>

        {escrowBalance > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-4 w-4 text-primary" />
                <h3 className="font-bold">Held safely for this job</h3>
              </div>
              <p className="text-2xl font-extrabold text-primary">
                ₹{escrowBalance.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {workerName} gets paid only when you release it. Not happy? Ask for a refund.
              </p>
            </Card>
          </motion.div>
        )}

        {settled && (
          <Card className="p-5 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-bold">Paid to {workerName}</p>
              <p className="text-xs text-muted-foreground">
                Released on {new Date(settled.released_at!).toLocaleDateString('en-IN')}
              </p>
            </div>
          </Card>
        )}

        {refunded && (
          <Card className="p-5 flex items-center gap-3">
            <RotateCcw className="h-8 w-8 text-amber-500" />
            <div>
              <p className="font-bold">Refunded</p>
              <p className="text-xs text-muted-foreground">
                ₹{refunded.refunded_amount.toLocaleString('en-IN')} returned to your account.
                Bank refunds take 5–7 working days.
              </p>
            </div>
          </Card>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span>Secure payment by Razorpay — UPI, cards, net banking and wallets.</span>
        </div>

        {isOwner && !activePayment && !settled && !refunded && (
          <Button
            className="w-full h-12 rounded-xl font-bold text-base gap-2"
            onClick={handlePay}
            disabled={busy !== null || total <= 0}
          >
            {busy === 'pay' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <IndianRupee className="h-5 w-5" />
            )}
            {busy === 'pay' ? 'Opening payment…' : `Pay ₹${total.toLocaleString('en-IN')} securely`}
          </Button>
        )}

        {isOwner && activePayment && (
          <div className="space-y-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full h-12 rounded-xl font-bold gap-2" disabled={busy !== null}>
                  {busy === 'release' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                  Release ₹{activePayment.amount.toLocaleString('en-IN')} to {workerName}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Release the money?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Only release once the work is finished. After this you cannot ask for a refund.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Not yet</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRelease}>Release money</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl font-bold gap-2"
                  disabled={busy !== null}
                >
                  {busy === 'refund' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-5 w-5" />
                  )}
                  Request a refund
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Refund this payment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The full amount goes back to the account you paid from. This cancels the job.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it held</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRefund}>Refund me</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {!isOwner && (
          <Card className="p-4 text-sm text-muted-foreground">
            <Badge variant="secondary" className="mb-2">Worker view</Badge>
            <p>
              {escrowBalance > 0
                ? `₹${escrowBalance.toLocaleString('en-IN')} is held for this job and will reach you when the customer confirms the work.`
                : 'No money is held for this job yet.'}
            </p>
          </Card>
        )}

        <Button variant="ghost" className="w-full" onClick={() => navigate('/customer')}>
          Back to home
        </Button>
      </div>
    </div>
  );
}
