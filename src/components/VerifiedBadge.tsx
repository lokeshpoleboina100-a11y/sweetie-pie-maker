import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Shows a "Verified" badge for workers who have completed
 * phone + ID verification (profile.is_verified === true).
 */
export default function VerifiedBadge({ showLabel = true, className, size = 'sm' }: VerifiedBadgeProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary font-semibold px-2 py-0.5 border border-primary/20',
        textSize,
        className
      )}
      aria-label="Verified worker"
      title="Phone & ID verified"
    >
      <BadgeCheck className={cn(iconSize, 'fill-primary text-primary-foreground')} strokeWidth={2.5} />
      {showLabel && <span>Verified</span>}
    </span>
  );
}
