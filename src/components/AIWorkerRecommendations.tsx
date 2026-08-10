import { useState } from 'react';
import { Sparkles, Loader2, Star, MessageSquare, MapPin, BadgeCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { recommendWorkers, type RecommendedWorker } from '@/services/ai';

interface Props {
  jobId: string;
  onChat: (workerId: string) => void;
}

export default function AIWorkerRecommendations({ jobId, onChat }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<RecommendedWorker[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [evaluated, setEvaluated] = useState<number | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const res = await recommendWorkers(jobId);
      setWorkers(res.recommendations);
      setNote(res.message ?? null);
      setEvaluated(res.candidates_evaluated ?? null);
    } catch (e) {
      toast({
        title: 'Recommendation failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Worker Recommendations
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ranked on rating, distance, experience, availability, response time & price
          </p>
        </div>
        <Button size="sm" onClick={run} disabled={loading} className="rounded-xl gap-1.5 shrink-0">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {workers ? 'Refresh' : 'Find Best Workers'}
        </Button>
      </div>

      {evaluated != null && workers && workers.length > 0 && (
        <p className="text-xs text-muted-foreground">{evaluated} worker profiles evaluated</p>
      )}

      {workers?.length === 0 && (
        <p className="text-xs text-muted-foreground">{note || 'No suitable workers found yet.'}</p>
      )}

      {workers?.map((w) => (
        <Card key={w.worker_id} className="p-3 bg-background space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate flex items-center gap-1">
                {w.worker_name}
                {w.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                {w.rating != null && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {w.rating} ({w.total_reviews})
                  </span>
                )}
                {w.distance_km != null && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {w.distance_km} km
                  </span>
                )}
                {w.experience_years != null && <span>🛠 {w.experience_years} yrs</span>}
                {w.bid_amount != null && <span>💰 ₹{w.bid_amount}</span>}
                {w.availability === 'available_in_area' && <span className="text-primary">⚡ In service area</span>}
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
              AI Match {Math.round(w.recommendation_score)}%
            </Badge>
          </div>

          <Progress value={w.recommendation_score} className="h-1.5" />

          {w.recommendation_reason.length > 0 && (
            <ul className="space-y-0.5">
              {w.recommendation_reason.slice(0, 5).map((r) => (
                <li key={r} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Check className="h-3 w-3 mt-0.5 text-primary shrink-0" /> {r}
                </li>
              ))}
            </ul>
          )}

          <Button
            size="sm"
            variant="outline"
            className="rounded-lg h-8 gap-1.5"
            onClick={() => onChat(w.worker_id)}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Contact
          </Button>
        </Card>
      ))}
    </Card>
  );
}
