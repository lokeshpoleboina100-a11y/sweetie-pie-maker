import { useParams, useNavigate } from 'react-router-dom';
import { Star, MessageSquare, CheckCircle, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { mockJobs, mockBids } from '@/lib/mock-data';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const job = mockJobs.find((j) => j.id === id);
  const bids = mockBids.filter((b) => b.jobId === id);

  if (!job) return <div className="p-8 text-center">Job not found</div>;

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader title="Job Details" showBack />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{CATEGORY_ICONS[job.category]}</span>
            <Badge variant="secondary">{CATEGORY_LABELS[job.category]}</Badge>
            {job.isInstant && <Badge className="bg-accent text-accent-foreground">⚡ Instant</Badge>}
          </div>
          <h2 className="text-xl font-extrabold mb-1">{job.title}</h2>
          <p className="text-sm text-muted-foreground mb-3">{job.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-primary">₹{job.budget.toLocaleString('en-IN')}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {job.location.address}
            </span>
          </div>
        </Card>

        <h3 className="font-bold text-base">{bids.length} Bids</h3>

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
                    {bid.workerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold">{bid.workerName}</h4>
                    <span className="text-lg font-extrabold text-primary">₹{bid.price}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-semibold">{bid.workerRating}</span>
                    <span>({bid.workerReviewCount} reviews)</span>
                    <span>• {bid.timeEstimate}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{bid.message}</p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="rounded-xl font-bold gap-1.5"
                      onClick={() => {
                        toast({ title: 'Worker accepted!', description: `${bid.workerName} will start soon.` });
                      }}
                    >
                      <CheckCircle className="h-4 w-4" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold gap-1.5"
                      onClick={() => navigate('/customer/chat/1')}
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
