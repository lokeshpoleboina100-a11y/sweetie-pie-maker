import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable';
import { SEO } from '@/components/SEO';

export default function Login() {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get('role') || 'customer') as 'customer' | 'worker';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !session) return;
    navigate((profile?.role || role) === 'worker' ? '/worker' : '/customer', { replace: true });
  }, [authLoading, navigate, profile?.role, role, session]);

  const handleGoogle = async () => {
    setLoading(true);
    window.localStorage.setItem('nearwork-auth-role', role);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/login?role=${role}`,
      extraParams: { prompt: 'select_account' },
    });
    if (result.error) {
      toast({
        title: 'Google sign-in failed',
        description: (result.error as Error).message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate(role === 'worker' ? '/worker' : '/customer', { replace: true });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-10">
      <SEO
        title="Sign In with Google | NearWork Freelance Marketplace"
        description="Sign in to NearWork with your Google account to post jobs, bid on gigs, and hire trusted local freelancers with secure escrow payments."
        path="/login"
        keywords="NearWork login, Google sign in, hire workers, freelance marketplace"
      />

      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#4c1d95,#1e3a8a,#3730a3,#5b21b6)] bg-[length:300%_300%] animate-[gradientShift_18s_ease_infinite]" />
      <div className="absolute -z-10 top-[-10%] left-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/30 blur-3xl animate-pulse" />
      <div className="absolute -z-10 bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-blue-400/30 blur-3xl animate-pulse [animation-duration:6s]" />
      <div className="absolute -z-10 top-1/2 left-1/3 h-[300px] w-[300px] rounded-full bg-indigo-400/20 blur-3xl" />

      <style>{`
        @keyframes gradientShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md rounded-3xl border border-white/25 bg-white/10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-8 text-white"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-md mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">NearWork</h1>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold">Welcome to NearWork</h2>
          <p className="text-sm text-white/70 mt-1">Continue as a {role} with your Google account</p>
        </div>

        <Button
          type="button"
          size="lg"
          disabled={loading}
          onClick={handleGoogle}
          className="w-full h-12 rounded-xl font-bold bg-white text-indigo-900 hover:bg-white/90"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Please wait…</>
          ) : (
            <>
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.75 3.98 14.6 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.2 0 8.64-3.65 8.64-8.8 0-.6-.06-1.05-.15-1.5z"/>
              </svg>
              Continue with Google
            </>
          )}
        </Button>

        <p className="mt-6 text-center text-xs text-white/70">
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
