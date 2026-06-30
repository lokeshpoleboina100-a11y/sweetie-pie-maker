import { useEffect, useState } from 'react';
import { Loader2, Bookmark } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import JobCard from '@/components/JobCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type DbJob = Tables<'jobs'>;

export default function WorkerSavedJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<DbJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('saved_jobs')
        .select('job_id, jobs(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      const list = (data || [])
        .map((r: any) => r.jobs as DbJob)
        .filter(Boolean);
      setJobs(list);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Saved Jobs" showBack />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No saved jobs yet</p>
            <p className="text-xs mt-1">Tap the bookmark icon on any job to save it for later.</p>
          </div>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job as any} viewAs="worker" />)
        )}
      </div>
      <BottomNav role="worker" />
    </div>
  );
}
