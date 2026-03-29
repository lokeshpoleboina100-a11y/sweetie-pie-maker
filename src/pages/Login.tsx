import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get('role') || 'customer') as 'customer' | 'worker';
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, role, fullName);
        if (error) {
          toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
          return;
        }
        toast({ title: 'Account created!', description: 'You are now logged in.' });
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
          return;
        }
      }
      navigate(role === 'customer' ? '/customer' : '/worker');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 bg-background">
      <Button variant="ghost" size="icon" className="-ml-2 mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <motion.form
        key={mode}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-extrabold mb-2">
          {mode === 'login' ? 'Welcome back!' : 'Create your account'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {mode === 'login'
            ? `Sign in as a ${role}`
            : `Sign up as a ${role}`}
        </p>

        <div className="space-y-4 mb-6">
          {mode === 'signup' && (
            <Input
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-14 text-lg rounded-2xl"
              required
              autoFocus
            />
          )}
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 text-lg rounded-2xl"
            required
            autoFocus={mode === 'login'}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 text-lg rounded-2xl"
            required
            minLength={6}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-base font-bold rounded-2xl"
          disabled={isLoading}
        >
          {isLoading ? (
            'Please wait...'
          ) : mode === 'login' ? (
            <><LogIn className="h-5 w-5 mr-2" /> Sign In</>
          ) : (
            <><UserPlus className="h-5 w-5 mr-2" /> Sign Up</>
          )}
        </Button>

        <button
          type="button"
          className="w-full text-center text-sm text-primary font-semibold mt-4"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </motion.form>
    </div>
  );
}
