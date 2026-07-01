import { MapPin, Zap, Users } from 'lucide-react';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import SaveJobButton from '@/components/SaveJobButton';
import type { Tables } from '@/integrations/supabase/types';

type DbJob = Tables<'jobs'>;

interface JobCardProps {
  job: DbJob;
  viewAs: 'customer' | 'worker';
  distanceKm?: number | null;
  showStatus?: boolean;
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

export default function JobCard({ job, viewAs, distanceKm, showStatus }: JobCardProps) {
  const navigate = useNavigate();
  const path = viewAs === 'worker' ? `/worker/job/${job.id}` : `/customer/job/${job.id}`;
  const budget = job.budget_max || job.budget_min || 0;
  const budgetType = job.is_negotiable ? 'negotiable' : 'fixed';
  const categoryKey = job.category as keyof typeof CATEGORY_ICONS;

  return (
    <Card
      className="p-4 cursor-pointer active:scale-[0.98] transition-transform relative"
      onClick={() => navigate(path)}
    >
      {viewAs === 'worker' && (
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
          <SaveJobButton jobId={job.id} />
        </div>
      )}
      <div className="flex items-start justify-between gap-3 pr-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-lg">{CATEGORY_ICONS[categoryKey]}</span>
            <Badge variant="secondary" className="text-xs font-medium">
              {CATEGORY_LABELS[categoryKey]}
            </Badge>
            {job.is_instant && (
              <Badge className="bg-accent text-accent-foreground text-xs gap-1">
                <Zap className="h-3 w-3" /> Instant
              </Badge>
            )}
            {distanceKm != null && job.latitude != null && job.longitude != null && (
              <Badge variant="outline" className="text-xs gap-1">
                <MapPin className="h-3 w-3" /> {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
              </Badge>
            )}
            {showStatus && (
              <Badge variant="outline" className="text-xs capitalize">
                {STATUS_LABEL[job.status as string] || job.status}
              </Badge>
            )}
          </div>
          <h3 className="font-bold text-base truncate">{job.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{job.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-extrabold text-primary">₹{budget.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">{budgetType}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {job.location_name || 'Unknown'}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Users className="h-3.5 w-3.5" />
          {job.bid_count || 0} bids
        </span>
      </div>
    </Card>
  );
}
