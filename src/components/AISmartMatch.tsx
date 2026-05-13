import { useState } from 'react';
import { Sparkles, Loader2, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Match { worker_id: string; score: number; reason: string; full_name?: string; rating?: number; }

export default function AISmartMatch({ job, onChat }: { job: any; onChat: (workerId: string) => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);

  const find = async () => {
    setLoading(true);
    try {
      // Pull candidate workers in same category
      const { data: workers } = await supabase
        .from('profiles')
        .select('user_id, full_name, skills, experience_years, rating, total_jobs_completed, location_name')
        .eq('role', 'worker')
        .contains('skills', [job.category])
        .limit(30);

      if (!workers || workers.length === 0) {
        toast({ title: 'No workers', description: 'No workers available for this category yet.' });
        setMatches([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-marketplace', {
        body: { action: 'match_workers', payload: { job, workers } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const map = new Map(workers.map((w: any) => [w.user_id, w]));
      const enriched = (data.matches || []).map((m: Match) => {
        const w: any = map.get(m.worker_id);
        return { ...m, full_name: w?.full_name, rating: w?.rating };
      });
      setMatches(enriched);
    } catch (e: any) {
      toast({ title: 'AI match failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Smart Match
        </h4>
        <Button size="sm" onClick={find} disabled={loading} className="rounded-xl gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {matches ? 'Refresh' : 'Find Best Workers'}
        </Button>
      </div>

      {matches?.length === 0 && <p className="text-xs text-muted-foreground">No matches found.</p>}

      {matches?.map((m) => (
        <Card key={m.worker_id} className="p-3 bg-background">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{m.full_name || 'Worker'}</p>
              {m.rating != null && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-warning text-warning" /> {m.rating}
                </div>
              )}
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">{m.score}% match</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{m.reason}</p>
          <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1.5" onClick={() => onChat(m.worker_id)}>
            <MessageSquare className="h-3.5 w-3.5" /> Contact
          </Button>
        </Card>
      ))}
    </Card>
  );
}
