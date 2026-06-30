import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MessageSquare, CheckCircle, MapPin, Loader2, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import Milestones from '@/components/Milestones';
import AISmartMatch from '@/components/AISmartMatch';

type DbJob = Tables<'jobs'>;

interface BidWithProfile {
  id: string;
  amount: number;
  message: string | null;
  estimated_time: string | null;
  status: string;
  worker_id: string;
  created_at: string;
  worker_name: string;
  worker_rating: number | null;
  worker_reviews: number | null;
}

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<DbJob | null>(null);
  const [bids, setBids] = useState<BidWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id!)
        .single();
      setJob(jobData);

      const { data: bidsData } = await supabase
        .from('bids')
        .select('*')
        .eq('job_id', id!)
        .order('created_at', { ascending: true });

      if (bidsData && bidsData.length > 0) {
        const workerIds = bidsData.map((b) => b.worker_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, rating, total_reviews')
          .in('user_id', workerIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        setBids(
          bidsData.map((b) => {
            const p = profileMap.get(b.worker_id);
            return {
              ...b,
              worker_name: p?.full_name || 'Worker',
              worker_rating: p?.rating ?? 0,
              worker_reviews: p?.total_reviews ?? 0,
            };
          })
        );
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleAccept = async (bid: BidWithProfile) => {
    await supabase
      .from('jobs')
      .update({ accepted_worker_id: bid.worker_id, status: 'in_progress' })
      .eq('id', id!);
    await supabase
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bid.id);
    toast({ title: 'Worker accepted!', description: `${bid.worker_name} will start soon.` });
    navigate('/customer');
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
            {job.is_instant && <Badge className="bg-accent text-accent-foreground">⚡ Instant</Badge>}
          </div>
          <h2 className="text-xl font-extrabold mb-1">{job.title}</h2>
          <p className="text-sm text-muted-foreground mb-3">{job.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-primary">₹{budget.toLocaleString('en-IN')}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {job.location_name || 'Unknown'}
            </span>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">JOB STATUS</p>
          <JobStatusControl
            jobId={job.id}
            status={job.status as any}
            onChange={(s) => setJob({ ...job, status: s as any })}
          />
        </Card>

        {job.status === 'open' && (
          <AISmartMatch job={job} onChat={() => navigate(`/customer/chat/${job.id}`)} />
        )}

        {(job.status === 'in_progress' || job.status === 'completed') && job.accepted_worker_id && (
          <>
            <Milestones
              jobId={job.id}
              customerId={job.customer_id}
              workerId={job.accepted_worker_id}
              escrowBalance={(job as any).escrow_balance ?? 0}
              onEscrowChange={(b) => setJob({ ...job, escrow_balance: b } as any)}
            />
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl font-bold text-base gap-2"
              onClick={() => navigate(`/customer/payment/${job.id}`)}
            >
              <IndianRupee className="h-5 w-5" /> One-time payment
            </Button>
          </>
        )}

        <h3 className="font-bold text-base">{bids.length} Bids</h3>

        {bids.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">No bids yet. Workers will bid soon!</p>
        )}

        {bids.map((bid, i) => (
          <motion.div
            key={bid.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {bid.worker_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold">{bid.worker_name}</h4>
                    <span className="text-lg font-extrabold text-primary">₹{bid.amount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-semibold">{bid.worker_rating}</span>
                    <span>({bid.worker_reviews} reviews)</span>
                    {bid.estimated_time && <span>• {bid.estimated_time}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{bid.message}</p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="rounded-xl font-bold gap-1.5"
                      onClick={() => handleAccept(bid)}
                    >
                      <CheckCircle className="h-4 w-4" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold gap-1.5"
                      onClick={() => navigate(`/customer/chat/${job.id}`)}
                    >
                      <MessageSquare className="h-4 w-4" /> Chat
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
