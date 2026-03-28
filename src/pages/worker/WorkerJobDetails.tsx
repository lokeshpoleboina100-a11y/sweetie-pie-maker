import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Send, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { mockJobs } from '@/lib/mock-data';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function WorkerJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const job = mockJobs.find((j) => j.id === id);
  const [showBidForm, setShowBidForm] = useState(false);

  if (!job) return <div className="p-8 text-center">Job not found</div>;

  const handleBid = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Bid submitted!', description: 'The customer will review your bid.' });
    navigate('/worker');
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader title="Job Details" showBack />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{CATEGORY_ICONS[job.category]}</span>
            <Badge variant="secondary">{CATEGORY_LABELS[job.category]}</Badge>
            {job.isInstant && (
              <Badge className="bg-accent text-accent-foreground gap-1">
                <Zap className="h-3 w-3" /> Instant
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-extrabold mb-1">{job.title}</h2>
          <p className="text-sm text-muted-foreground mb-3">{job.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-primary">₹{job.budget.toLocaleString('en-IN')}</span>
            <Badge variant="outline" className="text-xs">{job.budgetType}</Badge>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {job.location.address} • {job.distance} km away
          </div>
          <p className="text-xs text-muted-foreground mt-1">Posted by {job.customerName}</p>
        </Card>

        {!showBidForm ? (
          <div className="space-y-3">
            {job.isInstant ? (
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold rounded-2xl bg-accent hover:bg-accent/90 gap-2"
                onClick={() => {
                  toast({ title: 'Job accepted!', description: 'Contact the customer to start.' });
                  navigate('/worker');
                }}
              >
                <Zap className="h-5 w-5" /> Accept Instantly
              </Button>
            ) : null}
            <Button
              size="lg"
              variant={job.isInstant ? 'outline' : 'default'}
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
                <Input type="number" placeholder={String(job.budget)} className="h-12 rounded-xl" required />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Time Estimate</Label>
                <Input placeholder="e.g. 2 hours" className="h-12 rounded-xl" required />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Message to Customer</Label>
                <Textarea placeholder="Why should they choose you?" className="rounded-xl" required />
              </div>
            </Card>
            <Button type="submit" size="lg" className="w-full h-14 text-base font-bold rounded-2xl gap-2">
              <Send className="h-5 w-5" /> Submit Bid
            </Button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
