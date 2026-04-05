import { useState } from 'react';
import { CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayPaymentProps {
  amount: number;
  jobId: string;
  workerId: string;
  onSuccess?: () => void;
}

export default function RazorpayPayment({ amount, jobId, workerId, onSuccess }: RazorpayPaymentProps) {
  const { user, profile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi' | 'cash'>('razorpay');
  const [upiId, setUpiId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const commission = Math.round(amount * 0.1);
  const total = amount + commission;

  const handleRazorpayPayment = async () => {
    setProcessing(true);

    // Load Razorpay script if not loaded
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      toast.error('Razorpay is not configured');
      setProcessing(false);
      return;
    }

    const options = {
      key: razorpayKey,
      amount: total * 100, // in paise
      currency: 'INR',
      name: 'KaamWala',
      description: `Payment for Job`,
      handler: async (response: any) => {
        // Record payment in database
        await supabase.from('payments').insert({
          job_id: jobId,
          customer_id: user!.id,
          worker_id: workerId,
          amount: total,
          commission,
          payment_method: 'upi' as const,
          upi_transaction_id: response.razorpay_payment_id,
          status: 'completed' as const,
        });

        setSuccess(true);
        setProcessing(false);
        toast.success('Payment successful!');
        onSuccess?.();
      },
      prefill: {
        name: profile?.full_name || '',
        contact: profile?.phone || '',
      },
      theme: {
        color: '#6366f1',
      },
      modal: {
        ondismiss: () => setProcessing(false),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleManualPayment = async () => {
    if (paymentMethod === 'upi' && !upiId.trim()) {
      toast.error('Please enter UPI transaction ID');
      return;
    }
    setProcessing(true);

    await supabase.from('payments').insert({
      job_id: jobId,
      customer_id: user!.id,
      worker_id: workerId,
      amount: total,
      commission,
      payment_method: paymentMethod as 'upi' | 'cash',
      upi_transaction_id: paymentMethod === 'upi' ? upiId : null,
      status: paymentMethod === 'cash' ? 'pending' as const : 'completed' as const,
    });

    setSuccess(true);
    setProcessing(false);
    toast.success(paymentMethod === 'cash' ? 'Cash payment recorded' : 'Payment recorded');
    onSuccess?.();
  };

  if (success) {
    return (
      <Card className="p-6 text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
        <h3 className="text-xl font-bold">Payment Successful!</h3>
        <p className="text-muted-foreground">₹{total} paid successfully</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-5">
      <h3 className="font-bold text-lg">Payment</h3>

      {/* Amount breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service amount</span>
          <span>₹{amount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform fee (10%)</span>
          <span>₹{commission}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t border-border pt-2">
          <span>Total</span>
          <span>₹{total}</span>
        </div>
      </div>

      {/* Payment method */}
      <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
        <div className="flex items-center space-x-2 border rounded-xl p-3 cursor-pointer">
          <RadioGroupItem value="razorpay" id="razorpay" />
          <Label htmlFor="razorpay" className="flex-1 cursor-pointer">
            <span className="font-semibold">Pay with Razorpay</span>
            <span className="text-xs text-muted-foreground block">UPI, Cards, Net Banking, Wallets</span>
          </Label>
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center space-x-2 border rounded-xl p-3 cursor-pointer">
          <RadioGroupItem value="upi" id="upi-manual" />
          <Label htmlFor="upi-manual" className="flex-1 cursor-pointer">
            <span className="font-semibold">Manual UPI</span>
            <span className="text-xs text-muted-foreground block">Enter UPI transaction ID</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2 border rounded-xl p-3 cursor-pointer">
          <RadioGroupItem value="cash" id="cash" />
          <Label htmlFor="cash" className="flex-1 cursor-pointer">
            <span className="font-semibold">Cash Payment</span>
            <span className="text-xs text-muted-foreground block">Pay worker directly in cash</span>
          </Label>
        </div>
      </RadioGroup>

      {paymentMethod === 'upi' && (
        <Input
          placeholder="Enter UPI Transaction ID"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
        />
      )}

      <Button
        className="w-full h-12 rounded-xl gap-2"
        onClick={paymentMethod === 'razorpay' ? handleRazorpayPayment : handleManualPayment}
        disabled={processing}
      >
        {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {processing ? 'Processing...' : `Pay ₹${total}`}
      </Button>
    </Card>
  );
}
