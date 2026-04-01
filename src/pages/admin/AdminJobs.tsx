import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, MapPin, IndianRupee } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/types';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  budget_max: number | null;
  budget_min: number | null;
  location_name: string | null;
  bid_count: number | null;
  is_instant: boolean | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-primary/10 text-primary',
  in_progress: 'bg-info/10 text-info',
  completed: 'bg-accent/10 text-accent',
  cancelled: 'bg-destructive/10 text-destructive',
};

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchJobs = async (p = page, status = statusFilter) => {
    setLoading(true);
    try {
      const data = await adminFetch('get_jobs', {
        page: p,
        limit: 20,
        status: status === 'all' ? undefined : status,
      });
      setJobs(data.jobs);
      setTotal(data.total);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [page, statusFilter]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-extrabold">Job Reports</h2>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{total} total jobs</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const catKey = job.category as keyof typeof CATEGORY_ICONS;
            const budget = job.budget_max || job.budget_min || 0;

            return (
              <Card key={job.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span>{CATEGORY_ICONS[catKey] || '📋'}</span>
                      <span className="font-bold">{job.title}</span>
                      <Badge className={STATUS_STYLES[job.status] || ''}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                      {job.is_instant && <Badge className="bg-accent text-accent-foreground text-[10px]">⚡</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{job.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[catKey] || job.category}</Badge>
                      {budget > 0 && (
                        <span className="flex items-center gap-1 font-semibold">
                          <IndianRupee className="h-3 w-3" /> {budget.toLocaleString('en-IN')}
                        </span>
                      )}
                      {job.location_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {job.location_name}
                        </span>
                      )}
                      <span>{job.bid_count || 0} bids</span>
                      <span>{new Date(job.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {jobs.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No jobs found.</p>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
