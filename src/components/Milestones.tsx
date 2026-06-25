import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Clock, Send, Lock, Trash2, IndianRupee, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Milestone {
  id: string;
  job_id: string;
  customer_id: string;
  worker_id: string | null;
  title: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  order_index: number;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'released';
  submitted_at: string | null;
  released_at: string | null;
}

interface MilestonesProps {
  jobId: string;
  customerId: string;
  workerId: string | null;
  escrowBalance: number;
  onEscrowChange?: (newBalance: number) => void;
}

const statusMeta: Record<Milestone['status'], { label: string; cls: string; icon: any }> = {
  pending: { label: 'Pending', cls: 'bg-muted text-muted-foreground', icon: Clock },
  in_progress: { label: 'In Progress', cls: 'bg-blue-500/15 text-blue-600', icon: Clock },
  submitted: { label: 'Submitted', cls: 'bg-amber-500/15 text-amber-600', icon: Send },
  approved: { label: 'Approved', cls: 'bg-green-500/15 text-green-600', icon: CheckCircle2 },
  released: { label: 'Paid', cls: 'bg-primary/15 text-primary', icon: CheckCircle2 },
};

export default function Milestones({
  jobId,
  customerId,
  workerId,
  escrowBalance,
  onEscrowChange,
}: MilestonesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState(escrowBalance);

  const isCustomer = user?.id === customerId;
  const isWorker = !!workerId && user?.id === workerId;

  useEffect(() => setBalance(escrowBalance), [escrowBalance]);

  const load = async () => {
    const { data } = await supabase
      .from('milestones')
      .select('*')
      .eq('job_id', jobId)
      .order('order_index', { ascending: true });
    setMilestones((data ?? []) as Milestone[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`milestones-${jobId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'milestones', filter: `job_id=eq.${jobId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const totalPlanned = milestones.reduce((s, m) => s + m.amount, 0);
  const totalReleased = milestones
    .filter((m) => m.status === 'released')
    .reduce((s, m) => s + m.amount, 0);
  const totalEscrowed = milestones
    .filter((m) => m.status !== 'released' && m.status !== 'pending')
    .reduce((s, m) => s + m.amount, 0);

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const amt = parseInt(amount, 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      setBusy(false);
      return;
    }
    const { error } = await supabase.from('milestones').insert({
      job_id: jobId,
      customer_id: customerId,
      worker_id: workerId,
      title: title.trim().slice(0, 120),
      description: description.trim().slice(0, 1000) || null,
      amount: amt,
      due_date: dueDate || null,
      order_index: milestones.length,
      status: 'pending',
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not add milestone', description: error.message, variant: 'destructive' });
      return;
    }
    setTitle('');
    setDescription('');
    setAmount('');
    setDueDate('');
    setOpen(false);
    toast({ title: 'Milestone added' });
  };

  const fundMilestone = async (m: Milestone) => {
    if (!user) return;
    // Move to in_progress + record escrow fund + bump job escrow_balance
    const { error: txErr } = await supabase.from('escrow_transactions').insert({
      job_id: jobId,
      milestone_id: m.id,
      customer_id: customerId,
      worker_id: workerId,
      type: 'fund',
      amount: m.amount,
      notes: `Funded milestone "${m.title}"`,
    });
    if (txErr) {
      toast({ title: 'Funding failed', description: txErr.message, variant: 'destructive' });
      return;
    }
    await supabase.from('milestones').update({ status: 'in_progress' }).eq('id', m.id);
    // escrow_balance is recomputed server-side from escrow_transactions via trigger
    const newBal = balance + m.amount;
    setBalance(newBal);
    onEscrowChange?.(newBal);
    toast({ title: 'Funds held in escrow', description: `₹${m.amount} secured for the worker.` });
  };


  const submitMilestone = async (m: Milestone) => {
    const { error } = await supabase
      .from('milestones')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', m.id);
    if (error) {
      toast({ title: 'Submit failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marked as submitted', description: 'Waiting for client to approve.' });
  };

  const releaseMilestone = async (m: Milestone) => {
    if (!user) return;
    const { error: txErr } = await supabase.from('escrow_transactions').insert({
      job_id: jobId,
      milestone_id: m.id,
      customer_id: customerId,
      worker_id: workerId,
      type: 'release',
      amount: m.amount,
      notes: `Released for "${m.title}"`,
    });
    if (txErr) {
      toast({ title: 'Release failed', description: txErr.message, variant: 'destructive' });
      return;
    }
    await supabase
      .from('milestones')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', m.id);
    // escrow_balance is recomputed server-side from escrow_transactions via trigger
    const newBal = Math.max(0, balance - m.amount);
    setBalance(newBal);
    onEscrowChange?.(newBal);
    toast({ title: 'Payment released 🎉', description: `₹${m.amount} sent to worker.` });
  };


  const removeMilestone = async (m: Milestone) => {
    const { error } = await supabase.from('milestones').delete().eq('id', m.id);
    if (error)
      toast({ title: 'Cannot delete', description: error.message, variant: 'destructive' });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">Milestones &amp; Escrow</h3>
          <p className="text-xs text-muted-foreground">
            ₹{totalReleased.toLocaleString('en-IN')} paid · ₹
            {totalEscrowed.toLocaleString('en-IN')} in escrow · ₹
            {totalPlanned.toLocaleString('en-IN')} planned
          </p>
        </div>
        {isCustomer && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-1.5">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New milestone</DialogTitle>
              </DialogHeader>
              <form onSubmit={addMilestone} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Amount (₹)</Label>
                    <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add milestone'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          {isCustomer
            ? 'Break the project into milestones to release payment in stages.'
            : 'No milestones yet. The client will set them up.'}
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((m, i) => {
            const meta = statusMeta[m.status];
            const Icon = meta.icon;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border border-border rounded-xl p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm truncate">
                        {i + 1}. {m.title}
                      </span>
                      <Badge className={`gap-1 ${meta.cls}`} variant="secondary">
                        <Icon className="h-3 w-3" /> {meta.label}
                      </Badge>
                    </div>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                    )}
                    {m.due_date && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Due {new Date(m.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className="font-extrabold text-primary whitespace-nowrap">
                    ₹{m.amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {isCustomer && m.status === 'pending' && (
                    <>
                      <Button size="sm" className="rounded-lg gap-1.5" onClick={() => fundMilestone(m)}>
                        <Lock className="h-3.5 w-3.5" /> Fund escrow
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg gap-1.5 text-destructive border-destructive/30"
                        onClick={() => removeMilestone(m)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </>
                  )}
                  {isWorker && m.status === 'in_progress' && (
                    <Button size="sm" className="rounded-lg gap-1.5" onClick={() => submitMilestone(m)}>
                      <Send className="h-3.5 w-3.5" /> Mark submitted
                    </Button>
                  )}
                  {isCustomer && m.status === 'submitted' && (
                    <Button size="sm" className="rounded-lg gap-1.5" onClick={() => releaseMilestone(m)}>
                      <IndianRupee className="h-3.5 w-3.5" /> Approve &amp; release
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
