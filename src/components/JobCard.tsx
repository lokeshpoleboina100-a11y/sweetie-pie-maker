import { MapPin, Clock, Zap, Users } from 'lucide-react';
import { Job, CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface JobCardProps {
  job: Job;
  viewAs: 'customer' | 'worker';
}

export default function JobCard({ job, viewAs }: JobCardProps) {
  const navigate = useNavigate();
  const path = viewAs === 'worker' ? `/worker/job/${job.id}` : `/customer/job/${job.id}`;

  return (
    <Card
      className="p-4 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => navigate(path)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{CATEGORY_ICONS[job.category]}</span>
            <Badge variant="secondary" className="text-xs font-medium">
              {CATEGORY_LABELS[job.category]}
            </Badge>
            {job.isInstant && (
              <Badge className="bg-accent text-accent-foreground text-xs gap-1">
                <Zap className="h-3 w-3" /> Instant
              </Badge>
            )}
          </div>
          <h3 className="font-bold text-base truncate">{job.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{job.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-extrabold text-primary">₹{job.budget.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">{job.budgetType}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {job.location.address}
        </span>
        {job.distance !== undefined && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {job.distance} km
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Users className="h-3.5 w-3.5" />
          {job.bidCount} bids
        </span>
      </div>
    </Card>
  );
}
