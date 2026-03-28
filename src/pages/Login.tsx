import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, Phone } from 'lucide-react';
import { UserRole } from '@/lib/types';

export default function Login() {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get('role') || 'customer') as UserRole;
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const handleSendOtp = () => {
    if (phone.length >= 10) setStep('otp');
  };

  const handleVerifyOtp = () => {
    if (otp.length === 4) {
      navigate(role === 'customer' ? '/customer' : '/worker');
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 bg-background">
      <Button variant="ghost" size="icon" className="-ml-2 mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1"
      >
        {step === 'phone' ? (
          <>
            <h1 className="text-2xl font-extrabold mb-2">Enter your phone number</h1>
            <p className="text-muted-foreground mb-8">We'll send you a verification code</p>
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-2 h-14 px-4 rounded-2xl bg-secondary text-foreground font-bold text-lg shrink-0">
                🇮🇳 +91
              </div>
              <Input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="h-14 text-lg font-semibold rounded-2xl"
                autoFocus
              />
            </div>
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold rounded-2xl"
              disabled={phone.length < 10}
              onClick={handleSendOtp}
            >
              <Phone className="h-5 w-5 mr-2" />
              Send OTP
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold mb-2">Verify OTP</h1>
            <p className="text-muted-foreground mb-8">
              Code sent to +91 {phone.slice(0, 5)} {phone.slice(5)}
            </p>
            <div className="flex justify-center mb-8">
              <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-16 w-16 text-2xl font-bold rounded-xl" />
                  <InputOTPSlot index={1} className="h-16 w-16 text-2xl font-bold rounded-xl" />
                  <InputOTPSlot index={2} className="h-16 w-16 text-2xl font-bold rounded-xl" />
                  <InputOTPSlot index={3} className="h-16 w-16 text-2xl font-bold rounded-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold rounded-2xl"
              disabled={otp.length < 4}
              onClick={handleVerifyOtp}
            >
              Verify & Continue
            </Button>
            <button
              className="w-full text-center text-sm text-primary font-semibold mt-4"
              onClick={() => setStep('phone')}
            >
              Change phone number
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
