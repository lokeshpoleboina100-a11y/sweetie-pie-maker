import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'signin' | 'signup' | 'forgot';

export default function Login() {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get('role') || 'customer') as 'customer' | 'worker';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

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
        navigate(role === 'worker' ? '/worker' : '/customer');
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
