import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import JobCard from '@/components/JobCard';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type DbJob = Tables<'jobs'>;

export default function WorkerMyJobs() {
  const { user } = useAuth();
  const [activeJobs, setActiveJobs] = useState<DbJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<DbJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchMyJobs = async () => {
      const { data: active } = await supabase
        .from('jobs')
        .select('*')
        .eq('accepted_worker_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false });

      const { data: completed } = await supabase
        .from('jobs')
        .select('*')
        .eq('accepted_worker_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      setActiveJobs(active || []);
      setCompletedJobs(completed || []);
      setLoading(false);
    };
    fetchMyJobs();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="My Jobs" />
      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="active" className="flex-1">Active ({activeJobs.length})</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1">Completed ({completedJobs.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="space-y-3">
              {activeJobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No active jobs</p>
              ) : (
                activeJobs.map((job) => <JobCard key={job.id} job={job} viewAs="worker" />)
              )}
            </TabsContent>
            <TabsContent value="completed" className="space-y-3">
              {completedJobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No completed jobs yet</p>
              ) : (
                completedJobs.map((job) => <JobCard key={job.id} job={job} viewAs="worker" />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <BottomNav role="worker" />
    </div>
  );
}
