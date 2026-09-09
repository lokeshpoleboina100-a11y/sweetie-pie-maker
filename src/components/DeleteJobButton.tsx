import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type DbJob = Tables<'jobs'>;

interface DeleteJobButtonProps {
  job: DbJob;
  onDeleted?: (jobId: string) => void;
  variant?: 'icon' | 'full';
}

const UNDELETABLE = ['completed'];

export default function DeleteJobButton({ job, onDeleted, variant = 'icon' }: DeleteJobButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Only the customer who posted the job may remove it.
  if (!user || user.id !== job.customer_id) return null;

  const blocked = UNDELETABLE.includes(job.status as string);
  const bidCount = job.bid_count || 0;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Guard against paid jobs even if the status was not updated.
      const { data: paid } = await supabase
        .from('payments')
        .select('id')
        .eq('job_id', job.id)
        .eq('status', 'completed')
        .limit(1);
      if (paid && paid.length > 0) {
        throw new Error('This job already has a completed payment and cannot be deleted.');
      }

      const { error } = await supabase.from('jobs').delete().eq('id', job.id).eq('customer_id', user.id);
      if (error) {
        if (error.code === '23503') {
          throw new Error('This job has payment records linked to it and cannot be deleted.');
        }
        throw error;
      }

      toast({ title: 'Job deleted', description: `“${job.title}” and its bids have been removed.` });
      setOpen(false);
      onDeleted?.(job.id);
    } catch (err) {
      toast({
        title: 'Could not delete job',
        description: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });

    } finally {
      setDeleting(false);
    }
  };

  const trigger =
    variant === 'full' ? (
      <Button variant="destructive" className="w-full h-11 rounded-xl font-semibold gap-2" disabled={blocked}>
        <Trash2 className="h-4 w-4" /> Delete job
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-md border border-transparent text-job-card-accent hover:border-job-card-accent/35 hover:bg-job-card-accent/10 hover:text-job-card-accent"
        aria-label={`Delete job ${job.title}`}
        disabled={blocked}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );

  if (blocked) {
    return variant === 'full' ? trigger : null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{job.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All associated bids will also be removed.
            {bidCount > 0 && (
              <span className="block mt-2 font-semibold text-destructive">
                {bidCount} worker{bidCount === 1 ? '' : 's'} already placed a bid on this job.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Keep job</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {deleting ? 'Deleting…' : 'Delete job'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
