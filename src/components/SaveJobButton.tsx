import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SaveJobButton({ jobId, className }: { jobId: string; className?: string }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('saved_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, jobId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || loading) return;
    setLoading(true);
    if (saved) {
      const { error } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', user.id)
        .eq('job_id', jobId);
      if (!error) {
        setSaved(false);
        toast.success('Removed from saved jobs');
      }
    } else {
      const { error } = await supabase
        .from('saved_jobs')
        .insert({ user_id: user.id, job_id: jobId });
      if (!error) {
        setSaved(true);
        toast.success('Saved');
      }
    }
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 rounded-md border border-transparent text-job-card-accent hover:border-job-card-accent/35 hover:bg-job-card-accent/10 hover:text-job-card-accent', className)}
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? 'Unsave job' : 'Save job'}
    >
      {saved ? (
        <BookmarkCheck className="h-4 w-4 fill-job-card-accent text-job-card-accent" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </Button>
  );
}
