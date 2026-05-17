import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react';

export default function OtpLogin() {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get('role') || 'customer') as 'customer' | 'worker';
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-10 bg-background">
      <Button variant="ghost" size="icon" className="-ml-2 mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full"
      >
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
          <ShieldCheck className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-extrabold text-center mb-3">Login with OTP</h1>
        <p className="text-muted-foreground text-center mb-10">
          Choose how you'd like to receive your verification code
        </p>

        <div className="w-full space-y-4">
          <Button
            onClick={() => navigate(`/phone-login?role=${role}`)}
            className="w-full h-20 text-base font-bold rounded-2xl justify-start px-6 gap-4 group"
          >
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold">Login with Mobile Number</div>
              <div className="text-xs font-normal opacity-80">Get OTP via SMS</div>
            </div>
          </Button>

          <Button
            onClick={() => navigate(`/email-otp?role=${role}`)}
            variant="outline"
            className="w-full h-20 text-base font-bold rounded-2xl justify-start px-6 gap-4 group border-2"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold">Login with Email</div>
              <div className="text-xs font-normal text-muted-foreground">Get OTP via Email</div>
            </div>
          </Button>
        </div>

        <button
          type="button"
          className="text-sm text-muted-foreground font-medium mt-8 hover:text-primary transition-colors"
          onClick={() => navigate(`/login?role=${role}`)}
        >
          Use email & password instead
        </button>
      </motion.div>
    </div>
  );
}
