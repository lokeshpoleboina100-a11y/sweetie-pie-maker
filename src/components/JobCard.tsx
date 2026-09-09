import { ArrowUpRight, CalendarDays, MapPin, Users, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import SaveJobButton from '@/components/SaveJobButton';
import DeleteJobButton from '@/components/DeleteJobButton';
import { describeJobCategory } from '@/lib/serviceCatalog';
import type { Tables } from '@/integrations/supabase/types';

type DbJob = Tables<'jobs'>;

interface JobCardProps {
  job: DbJob;
  viewAs: 'customer' | 'worker';
  distanceKm?: number | null;
  showStatus?: boolean;
  /** Show a delete control (customer's own jobs only). */
  allowDelete?: boolean;
  onDeleted?: (jobId: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  paused: 'Paused',
  closed: 'Closed',
  filled: 'Filled',
};

export default function JobCard({ job, viewAs, distanceKm, showStatus, allowDelete, onDeleted }: JobCardProps) {
  const navigate = useNavigate();
  const path = viewAs === 'worker' ? `/worker/job/${job.id}` : `/customer/job/${job.id}`;
  const budget = job.budget_max || job.budget_min || 0;
  const budgetType = job.is_negotiable ? 'negotiable' : 'fixed';
  const { icon, group, service } = describeJobCategory(job.category, job.service);

  return (
    <Card
      className="job-card group relative cursor-pointer overflow-hidden rounded-lg border-job-card-border bg-job-card p-4 text-job-card-foreground shadow-job-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-job-card-accent/55 hover:shadow-job-card-hover active:translate-y-0 sm:p-5"
      onClick={() => navigate(path)}
    >
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 sm:right-4 sm:top-4" onClick={(e) => e.stopPropagation()}>
        {viewAs === 'worker' && <SaveJobButton jobId={job.id} />}
        {allowDelete && <DeleteJobButton job={job} onDeleted={onDeleted} />}
      </div>
      <div className="flex min-w-0 items-start gap-3 pr-9">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-job-card-accent/35 bg-job-card-accent/10 text-sm shadow-job-card-icon" aria-hidden="true">{icon}</span>
            <Badge variant="outline" className="h-7 border-job-card-accent/35 bg-job-card-accent/10 px-2.5 text-[11px] font-semibold text-job-card-accent">
              {group}
            </Badge>
            {service && (
              <Badge variant="outline" className="h-7 border-job-card-accent/25 bg-job-card-accent/5 px-2.5 text-[11px] font-medium text-job-card-accent">
                {service}
              </Badge>
            )}
            {job.is_instant && (
              <Badge variant="outline" className="h-7 gap-1 border-job-card-accent/35 bg-job-card-accent/10 px-2 text-[11px] text-job-card-accent">
                <Zap className="h-3 w-3" /> Instant
              </Badge>
            )}
            {distanceKm != null && job.latitude != null && job.longitude != null && (
              <Badge variant="outline" className="h-7 gap-1 border-job-card-accent/25 bg-job-card-accent/5 px-2 text-[11px] text-job-card-muted">
                <MapPin className="h-3 w-3" /> {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
              </Badge>
            )}
            {showStatus && (
              <Badge variant="outline" className="h-7 border-job-card-accent/25 bg-job-card-accent/5 px-2 text-[11px] capitalize text-job-card-accent">
                {STATUS_LABEL[job.status as string] || job.status}
              </Badge>
            )}
          </div>
          <h3 className="truncate text-base font-bold leading-snug text-job-card-foreground sm:text-lg">{job.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-job-card-muted">{job.description}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-job-card-border/70 pt-3 text-xs text-job-card-muted sm:flex sm:flex-wrap sm:items-center">
        <span className="col-span-2 flex min-w-0 items-center gap-1.5 sm:col-span-1">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-job-card-accent" />
          <span className="truncate">{job.location_name || 'Unknown'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-job-card-accent" />
          {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="flex items-center justify-end gap-1.5 sm:ml-auto">
          <Users className="h-3.5 w-3.5 shrink-0 text-job-card-accent" />
          {job.bid_count || 0} bids
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xl font-extrabold leading-none text-job-card-accent">₹{budget.toLocaleString('en-IN')}</p>
          <p className="mt-1 text-[10px] font-bold uppercase text-job-card-muted">{budgetType}</p>
        </div>
        <Button
          size="sm"
          className="h-9 rounded-md bg-job-card-accent px-3.5 text-xs font-bold text-job-card-accent-foreground shadow-job-card-button hover:bg-job-card-accent/90"
          onClick={(event) => {
            event.stopPropagation();
            navigate(path);
          }}
        >
          View details <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
