import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Send, Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import Milestones from '@/components/Milestones';

type DbJob = Tables<'jobs'>;

export default function WorkerJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [job, setJob] = useState<DbJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      const { data } = await supabase.from('jobs').select('*').eq('id', id!).single();
      setJob(data);
      setLoading(false);
    };
    fetchJob();
  }, [id]);

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !job) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('bids').insert({
        job_id: job.id,
        worker_id: user.id,
        amount: parseInt(bidAmount),
        estimated_time: timeEstimate,
        message,
      });
      if (error) throw error;
      toast({ title: 'Bid submitted!', description: 'The customer will review your bid.' });
      navigate('/worker');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Job Details" showBack />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!job) return <div className="p-8 text-center">Job not found</div>;

  const budget = job.budget_max || job.budget_min || 0;
  const categoryKey = job.category as keyof typeof CATEGORY_ICONS;

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader title="Job Details" showBack />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{CATEGORY_ICONS[categoryKey]}</span>
            <Badge variant="secondary">{CATEGORY_LABELS[categoryKey]}</Badge>
            {job.is_instant && (
              <Badge className="bg-accent text-accent-foreground gap-1">
                <Zap className="h-3 w-3" /> Instant
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-extrabold mb-1">{job.title}</h2>
          <p className="text-sm text-muted-foreground mb-3">{job.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-primary">₹{budget.toLocaleString('en-IN')}</span>
            <Badge variant="outline" className="text-xs">{job.is_negotiable ? 'negotiable' : 'fixed'}</Badge>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {job.location_name || 'Unknown'}
          </div>
        </Card>

        {job.accepted_worker_id === user?.id && (job.status === 'in_progress' || job.status === 'completed') && (
          <Milestones
            jobId={job.id}
            customerId={job.customer_id}
            workerId={job.accepted_worker_id}
            escrowBalance={(job as any).escrow_balance ?? 0}
          />
        )}

        {!showBidForm ? (
          <div className="space-y-3">
            {job.is_instant && (
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold rounded-2xl bg-accent hover:bg-accent/90 gap-2"
                onClick={async () => {
                  if (!user) return;
                  await supabase.from('jobs').update({ accepted_worker_id: user.id, status: 'in_progress' }).eq('id', job.id);
                  toast({ title: 'Job accepted!', description: 'Contact the customer to start.' });
                  navigate('/worker');
                }}
              >
                <Zap className="h-5 w-5" /> Accept Instantly
              </Button>
            )}
            <Button
              size="lg"
              variant={job.is_instant ? 'outline' : 'default'}
              className="w-full h-14 text-base font-bold rounded-2xl"
              onClick={() => setShowBidForm(true)}
            >
              Place a Bid
            </Button>
          </div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
            onSubmit={handleBid}
          >
            <Card className="p-4 space-y-4">
              <h3 className="font-bold">Your Bid</h3>
              <div className="space-y-2">
                <Label className="font-bold">Your Price (₹)</Label>
                <Input type="number" placeholder={String(budget)} className="h-12 rounded-xl" required value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Time Estimate</Label>
                <Input placeholder="e.g. 2 hours" className="h-12 rounded-xl" required value={timeEstimate} onChange={(e) => setTimeEstimate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Message to Customer</Label>
                <Textarea placeholder="Why should they choose you?" className="rounded-xl" required value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
            </Card>
            <Button type="submit" size="lg" className="w-full h-14 text-base font-bold rounded-2xl gap-2" disabled={isSubmitting}>
              <Send className="h-5 w-5" /> {isSubmitting ? 'Submitting...' : 'Submit Bid'}
            </Button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
