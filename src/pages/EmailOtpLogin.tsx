import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { z } from 'zod';

const emailSchema = z.string().trim().email({ message: 'Invalid email address' }).max(255);

export default function EmailOtpLogin() {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get('role') || 'customer') as 'customer' | 'worker';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendOtp = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: 'Invalid email', description: parsed.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/${role}`,
          data: { role },
        },
      });
      if (error) throw error;
      setStep('otp');
      setCooldown(45);
      toast({ title: 'OTP Sent! 📧', description: `Verification code sent to ${parsed.data}` });
    } catch (e: any) {
      toast({ title: 'Failed to send OTP', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (error) throw error;
      toast({ title: 'Welcome! 🎉' });
      navigate(role === 'customer' ? '/customer' : '/worker');
    } catch (e: any) {
      toast({ title: 'Verification failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 bg-background">
      <Button variant="ghost" size="icon" className="-ml-2 mb-4" onClick={() => step === 'otp' ? setStep('email') : navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <AnimatePresence mode="wait">
        {step === 'email' ? (
          <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold mb-2">Login with Email OTP</h1>
            <p className="text-muted-foreground mb-8">We'll send a 6-digit code to your email</p>

            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-14 text-lg rounded-2xl mb-6"
              autoFocus
            />

            <Button onClick={sendOtp} disabled={loading} className="w-full h-14 text-base font-bold rounded-2xl">
              {loading ? t('login.please_wait') : 'Send OTP'}
            </Button>

            <button type="button" className="w-full text-center text-sm text-primary font-semibold mt-4" onClick={() => navigate(`/phone-login?role=${role}`)}>
              Use phone number instead
            </button>
            <button type="button" className="w-full text-center text-sm text-muted-foreground font-medium mt-2" onClick={() => navigate(`/login?role=${role}`)}>
              Use email & password
            </button>
          </motion.div>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold mb-2">Verify OTP</h1>
            <p className="text-muted-foreground mb-8">Enter the 6-digit code sent to {email}</p>

            <div className="flex justify-center mb-6">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button onClick={verifyOtp} disabled={loading || otp.length !== 6} className="w-full h-14 text-base font-bold rounded-2xl">
              {loading ? t('login.please_wait') : 'Verify & Login'}
            </Button>

            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground mt-4 disabled:opacity-50"
              onClick={sendOtp}
              disabled={loading || cooldown > 0}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
