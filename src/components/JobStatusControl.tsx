import { useState } from 'react';
import { Loader2, Pause, Play, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'paused' | 'closed' | 'filled';

interface Props {
  jobId: string;
  status: JobStatus;
  onChange?: (status: JobStatus) => void;
}

const STATUS_META: Record<JobStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Open', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  paused: { label: 'Paused', variant: 'secondary' },
  closed: { label: 'Closed', variant: 'outline' },
  filled: { label: 'Filled', variant: 'outline' },
};

export default function JobStatusControl({ jobId, status, onChange }: Props) {
  const [loading, setLoading] = useState<JobStatus | null>(null);

  const update = async (next: JobStatus) => {
    setLoading(next);
    const { error } = await supabase
      .from('jobs')
      .update({ status: next as any })
      .eq('id', jobId);
    setLoading(null);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success(`Job marked as ${STATUS_META[next].label}`);
    onChange?.(next);
  };

  const meta = STATUS_META[status];

  const actions: { value: JobStatus; label: string; icon: React.ElementType }[] = [];
  if (status === 'open') {
    actions.push({ value: 'paused', label: 'Pause', icon: Pause });
    actions.push({ value: 'filled', label: 'Mark Filled', icon: CheckCircle2 });
    actions.push({ value: 'closed', label: 'Close', icon: Lock });
  } else if (status === 'paused') {
    actions.push({ value: 'open', label: 'Resume', icon: Play });
    actions.push({ value: 'closed', label: 'Close', icon: Lock });
  } else if (status === 'closed' || status === 'filled') {
    actions.push({ value: 'open', label: 'Reopen', icon: Play });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={meta.variant}>{meta.label}</Badge>
      {actions.map((a) => (
        <Button
          key={a.value}
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => update(a.value)}
        >
          {loading === a.value ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <a.icon className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">{a.label}</span>
        </Button>
      ))}
    </div>
  );
}
