import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get('role') || 'customer') as 'customer' | 'worker';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGuest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { role, full_name: `Guest ${Math.floor(Math.random() * 9000 + 1000)}` } },
      });
      if (error || !data.user) {
        toast({
          title: 'Guest sign-in failed',
          description: error?.message || 'Please try again in a moment.',
          variant: 'destructive',
        });
        return;
      }
      navigate(role === 'customer' ? '/customer' : '/worker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 bg-background">
      <Button variant="ghost" size="icon" className="-ml-2 mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full"
      >
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <UserCircle2 className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-center mb-2">Continue as Guest</h1>
        <p className="text-muted-foreground text-center mb-8">
          Jump straight in as a {role}. No email, no password — just start using the app instantly.
        </p>

        <Button
          onClick={handleGuest}
          size="lg"
          className="w-full h-14 text-base font-bold rounded-2xl"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Signing in…</>
          ) : (
            <><UserCircle2 className="h-5 w-5 mr-2" /> Continue as Guest</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-6">
          A temporary guest account will be created for you. You can complete your profile from Settings later.
        </p>
      </motion.div>
    </div>
  );
}
