import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Phone, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function PhoneLogin() {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get('role') || 'customer') as 'customer' | 'worker';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (phone.length < 10) {
      toast({ title: 'Invalid phone', description: 'Please enter a valid phone number', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          data: { role },
        },
      });
      if (error) throw error;
      setStep('otp');
      toast({ title: 'OTP Sent! 📱', description: `Verification code sent to ${phone}` });
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
        phone,
        token: otp,
        type: 'sms',
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
      <Button variant="ghost" size="icon" className="-ml-2 mb-4" onClick={() => step === 'otp' ? setStep('phone') : navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold mb-2">{t('phone_login.title', 'Enter Phone Number')}</h1>
            <p className="text-muted-foreground mb-8">{t('phone_login.subtitle', 'We\'ll send you a verification code via SMS')}</p>

            <Input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="h-14 text-lg rounded-2xl mb-6"
              autoFocus
            />

            <Button onClick={sendOtp} disabled={loading} className="w-full h-14 text-base font-bold rounded-2xl">
              {loading ? t('login.please_wait') : t('phone_login.send_otp', 'Send OTP')}
            </Button>

            <button
              type="button"
              className="w-full text-center text-sm text-primary font-semibold mt-4"
              onClick={() => navigate(`/login?role=${role}`)}
            >
              {t('phone_login.use_email', 'Use email instead')}
            </button>
          </motion.div>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold mb-2">{t('phone_login.verify_title', 'Verify OTP')}</h1>
            <p className="text-muted-foreground mb-8">{t('phone_login.verify_subtitle', 'Enter the 6-digit code sent to')} {phone}</p>

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
              {loading ? t('login.please_wait') : t('phone_login.verify', 'Verify & Login')}
            </Button>

            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground mt-4"
              onClick={sendOtp}
              disabled={loading}
            >
              {t('phone_login.resend', 'Resend OTP')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
