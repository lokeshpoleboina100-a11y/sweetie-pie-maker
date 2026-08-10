import { useState } from 'react';
import { Trophy, Loader2, Star, MapPin, CheckCircle, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { rankBids, type RankedBid } from '@/services/ai';

interface Props {
  jobId: string;
  canAccept?: boolean;
  onAccept?: (bid: RankedBid) => void;
}

const BREAKDOWN: { key: keyof RankedBid['score_breakdown']; label: string; weight: number }[] = [
  { key: 'rating', label: 'Rating', weight: 35 },
  { key: 'distance', label: 'Distance', weight: 25 },
  { key: 'price', label: 'Price', weight: 20 },
  { key: 'experience', label: 'Experience', weight: 20 },
];

export default function AIBidRanking({ jobId, canAccept, onAccept }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ranked, setRanked] = useState<RankedBid[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const res = await rankBids(jobId);
      setRanked(res.ranked_bids);
      setNote(res.message ?? null);
    } catch (e) {
      toast({
        title: 'Bid ranking failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Smart Bid Ranking
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            35% rating · 25% distance · 20% price · 20% experience
          </p>
        </div>
        <Button size="sm" onClick={run} disabled={loading} className="rounded-xl gap-1.5 shrink-0">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />}
          {ranked ? 'Re-rank' : 'Rank Bids'}
        </Button>
      </div>

      {ranked?.length === 0 && (
        <p className="text-xs text-muted-foreground">{note || 'No bids submitted yet.'}</p>
      )}

      {ranked?.map((b) => (
        <Card key={b.bid_id} className="p-3 bg-background space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate flex items-center gap-1">
                <span className="text-muted-foreground">#{b.ranking}</span> {b.worker_name}
                {b.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                {b.rating != null && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {b.rating}
                  </span>
                )}
                {b.distance_km != null && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {b.distance_km} km
                  </span>
                )}
                {b.experience_years != null && <span>🛠 {b.experience_years} yrs</span>}
                <span className="font-semibold text-foreground">₹{b.amount}</span>
                {b.estimated_time && <span>• {b.estimated_time}</span>}
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
              AI Score {b.ai_score}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {BREAKDOWN.map((f) => (
              <div key={f.key}>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {f.label} <span className="opacity-60">{f.weight}%</span>
                  </span>
                  <span>{b.score_breakdown[f.key]}</span>
                </div>
                <Progress value={b.score_breakdown[f.key]} className="h-1" />
              </div>
            ))}
          </div>

          {canAccept && b.status === 'pending' && onAccept && (
            <Button size="sm" className="rounded-lg h-8 gap-1.5" onClick={() => onAccept(b)}>
              <CheckCircle className="h-3.5 w-3.5" /> Accept this bid
            </Button>
          )}
        </Card>
      ))}
    </Card>
  );
}
