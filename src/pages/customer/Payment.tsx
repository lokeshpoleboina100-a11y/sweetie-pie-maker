import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IndianRupee, Smartphone, QrCode, CheckCircle2, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type DbJob = Tables<'jobs'>;

const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', icon: '💳', color: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'phonepe', name: 'PhonePe', icon: '💜', color: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'paytm', name: 'Paytm', icon: '🔵', color: 'bg-sky-500/10 border-sky-500/30' },
  { id: 'upi', name: 'UPI ID', icon: '🏦', color: 'bg-green-500/10 border-green-500/30' },
];

type PaymentStep = 'summary' | 'method' | 'processing' | 'success';

export default function Payment() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [job, setJob] = useState<DbJob | null>(null);
  const [workerName, setWorkerName] = useState('Worker');
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<PaymentStep>('summary');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [upiId, setUpiId] = useState('');

  const COMMISSION_RATE = 0.1; // 10%

  useEffect(() => {
    const fetchJob = async () => {
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId!)
        .single();
      setJob(jobData);

      if (jobData?.accepted_worker_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', jobData.accepted_worker_id)
          .single();
        if (profile) setWorkerName(profile.full_name);
      }
      setLoading(false);
    };
    fetchJob();
  }, [jobId]);

  const amount = job?.budget_max || job?.budget_min || 0;
  const commission = Math.round(amount * COMMISSION_RATE);
  const totalAmount = amount + commission;

  const handlePay = async () => {
    if (step === 'summary') {
      setStep('method');
      return;
    }

    if (step === 'method') {
      if (!selectedApp) {
        toast({ title: 'Select a payment method', variant: 'destructive' });
        return;
      }
      if (selectedApp === 'upi' && !upiId.includes('@')) {
        toast({ title: 'Enter a valid UPI ID', description: 'e.g. name@upi', variant: 'destructive' });
        return;
      }

      setStep('processing');

      // Simulate UPI processing
      await new Promise((r) => setTimeout(r, 2500));

      const txnId = `TXN${Date.now()}`;

      const { error } = await supabase.from('payments').insert({
        job_id: jobId!,
        customer_id: user!.id,
        worker_id: job!.accepted_worker_id!,
        amount,
        commission,
        payment_method: 'upi' as const,
        upi_transaction_id: txnId,
        status: 'completed' as const,
      });

      if (error) {
        toast({ title: 'Payment failed', description: error.message, variant: 'destructive' });
        setStep('method');
        return;
      }

      // Mark job as completed
      await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId!);

      setStep('success');
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

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader title="Payment" showBack />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* STEP: SUMMARY */}
          {step === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Payment Summary</h3>
                <h2 className="text-lg font-extrabold mb-1">{job.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">Worker: {workerName}</p>
                <Separator className="my-3" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Amount</span>
                    <span className="font-semibold">₹{amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (10%)</span>
                    <span className="font-semibold">₹{commission.toLocaleString('en-IN')}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base">
                    <span className="font-bold">Total</span>
                    <span className="font-extrabold text-primary text-xl">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </Card>

              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>Secure payment powered by UPI. Your money is safe.</span>
              </div>

              <Button className="w-full h-12 rounded-xl font-bold text-base gap-2" onClick={handlePay}>
                Proceed to Pay <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* STEP: METHOD */}
          {step === 'method' && (
            <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Pay</h3>
                <p className="text-2xl font-extrabold text-primary mb-4">₹{totalAmount.toLocaleString('en-IN')}</p>

                <h4 className="text-sm font-bold mb-3">Choose UPI App</h4>
                <div className="grid grid-cols-2 gap-3">
                  {UPI_APPS.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedApp(app.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        selectedApp === app.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : `${app.color} hover:border-primary/50`
                      }`}
                    >
                      <span className="text-2xl">{app.icon}</span>
                      <span className="font-semibold text-sm">{app.name}</span>
                    </button>
                  ))}
                </div>

                {selectedApp === 'upi' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                    <Label htmlFor="upi-id" className="text-sm font-semibold">UPI ID</Label>
                    <Input
                      id="upi-id"
                      placeholder="yourname@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="mt-1.5 rounded-xl"
                    />
                  </motion.div>
                )}
              </Card>

              <Button className="w-full h-12 rounded-xl font-bold text-base gap-2" onClick={handlePay}>
                <IndianRupee className="h-5 w-5" /> Pay ₹{totalAmount.toLocaleString('en-IN')}
              </Button>
            </motion.div>
          )}

          {/* STEP: PROCESSING */}
          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold mb-1">Processing Payment</h3>
                <p className="text-sm text-muted-foreground">Complete the payment in your UPI app...</p>
              </div>
            </motion.div>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center"
              >
                <CheckCircle2 className="h-14 w-14 text-green-500" />
              </motion.div>
              <div className="text-center">
                <h3 className="text-xl font-extrabold mb-1">Payment Successful!</h3>
                <p className="text-sm text-muted-foreground mb-1">₹{totalAmount.toLocaleString('en-IN')} paid to {workerName}</p>
                <Badge variant="secondary" className="mt-2">Job Completed ✓</Badge>
              </div>
              <div className="w-full space-y-3 pt-4">
                <Button className="w-full h-12 rounded-xl font-bold" onClick={() => navigate(`/customer/chat/${jobId}`)}>
                  Leave a Review
                </Button>
                <Button variant="outline" className="w-full h-12 rounded-xl font-bold" onClick={() => navigate('/customer')}>
                  Back to Home
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
