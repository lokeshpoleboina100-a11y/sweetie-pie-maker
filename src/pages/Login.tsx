import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable';
import { SEO } from '@/components/SEO';

type Mode = 'signin' | 'signup' | 'forgot';

export default function Login() {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get('role') || 'customer') as 'customer' | 'worker';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, resetPassword, session, profile, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (authLoading || !session) return;
    navigate((profile?.role || role) === 'worker' ? '/worker' : '/customer', { replace: true });
  }, [authLoading, navigate, profile?.role, role, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
          return;
        }
        navigate(role === 'worker' ? '/worker' : '/customer', { replace: true });
      } else if (mode === 'signup') {
        if (password !== confirm) {
          toast({ title: 'Passwords do not match', variant: 'destructive' });
          return;
        }
        if (password.length < 6) {
          toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
          return;
        }
        const { error } = await signUp(email, password, fullName, role);
        if (error) {
          toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
          return;
        }
        toast({ title: 'Account created', description: 'Check your email to confirm, then sign in.' });
        setMode('signin');
      } else {
        const { error } = await resetPassword(email);
        if (error) {
          toast({ title: 'Reset failed', description: error.message, variant: 'destructive' });
          return;
        }
        toast({ title: 'Reset link sent', description: 'Check your inbox to reset your password.' });
        setMode('signin');
      }
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password';
  const subtitle =
    mode === 'signin'
      ? 'Sign in to continue to NearWork'
      : mode === 'signup'
      ? `Join as a ${role}`
      : "We'll email you a reset link";

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-10">
      <SEO
        title="Sign In or Sign Up | NearWork Freelance Marketplace"
        description="Sign in or create a free NearWork account to post jobs, bid on gigs, and hire trusted local freelancers with secure escrow payments."
        path="/login"
        keywords="NearWork login, freelancer sign up, hire workers, join freelance marketplace"
      />
      {/* Animated gradient background */}

      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#4c1d95,#1e3a8a,#3730a3,#5b21b6)] bg-[length:300%_300%] animate-[gradientShift_18s_ease_infinite]" />
      {/* Floating glow orbs */}
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
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-md mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">NearWork</h1>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-white/70 mt-1">{subtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-white/90">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-white/15 border-white/25 text-white placeholder:text-white/50 focus-visible:ring-white/60"
                  placeholder="Jane Doe"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/90">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/15 border-white/25 text-white placeholder:text-white/50 focus-visible:ring-white/60"
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/90">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/15 border-white/25 text-white placeholder:text-white/50 focus-visible:ring-white/60"
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-white/90">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/15 border-white/25 text-white placeholder:text-white/50 focus-visible:ring-white/60"
                  placeholder="••••••••"
                />
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold bg-white text-indigo-900 hover:bg-white/90"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Please wait…</>
              ) : mode === 'signin' ? (
                'Sign In'
              ) : mode === 'signup' ? (
                'Create Account'
              ) : (
                'Send reset link'
              )}
            </Button>
          </motion.form>
        </AnimatePresence>

        {mode !== 'forgot' && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/20" />
              <span className="text-xs text-white/60">OR</span>
              <div className="h-px flex-1 bg-white/20" />
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                window.localStorage.setItem('nearwork-auth-role', role);
                const result = await lovable.auth.signInWithOAuth('google', {
                  redirect_uri: `${window.location.origin}/login?role=${role}`,
                  extraParams: { prompt: 'select_account' },
                });
                if (result.error) {
                  toast({ title: 'Google sign-in failed', description: (result.error as Error).message, variant: 'destructive' });
                  setLoading(false);
                  return;
                }
                if (result.redirected) return;
                navigate(role === 'worker' ? '/worker' : '/customer', { replace: true });
              }}
              className="w-full h-12 rounded-xl font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.75 3.98 14.6 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.2 0 8.64-3.65 8.64-8.8 0-.6-.06-1.05-.15-1.5z"/></svg>
              Continue with Google
            </Button>
          </>
        )}

        <div className="mt-6 text-center text-sm text-white/80 space-y-2">
          {mode === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="underline underline-offset-2 hover:text-white"
              >
                Forgot password?
              </button>
              <div>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-semibold underline underline-offset-2 hover:text-white"
                >
                  Create one
                </button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <div>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-semibold underline underline-offset-2 hover:text-white"
              >
                Sign in
              </button>
            </div>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="underline underline-offset-2 hover:text-white"
            >
              Back to sign in
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
