import { useState } from 'react';
import { Sparkles, Loader2, Wand2, IndianRupee, Clock, ChevronDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { classifyIssue, estimateJob, type IssueClassification, type JobEstimate } from '@/services/ai';
import { CATEGORY_ICONS, CATEGORY_LABELS, JobCategory } from '@/lib/types';


interface Props {
  title: string;
  description: string;
  /** Called when the customer accepts the AI-detected category. */
  onApplyCategory: (category: string) => void;
  /** Called when the customer accepts the suggested typical price. */
  onApplyBudget?: (amount: number) => void;
}

const URGENCY_STYLES: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  normal: 'bg-primary/10 text-primary border-primary/25',
  low: 'bg-muted text-muted-foreground border-border',
};

export default function AIJobAssistant({ title, description, onApplyCategory, onApplyBudget }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classification, setClassification] = useState<IssueClassification | null>(null);
  const [estimate, setEstimate] = useState<JobEstimate | null>(null);

  const text = `${title} ${description}`.trim();

  const analyse = async () => {
    if (text.length < 5) {
      toast({ title: 'Add a few more details', description: 'Describe the problem so the AI can analyse it.' });
      return;
    }
    setLoading(true);
    try {
      const cls = await classifyIssue({ title, description });
      setClassification(cls);
      const est = await estimateJob({ category: cls.category, urgency: cls.urgency });
      setEstimate(est);
    } catch (e: any) {
      toast({ title: 'AI analysis failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 border-primary/25 bg-primary/5 rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI job analysis
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detects the service type and predicts a fair price and time from marketplace data.
          </p>
        </div>
        <Button type="button" size="sm" onClick={analyse} disabled={loading} className="rounded-xl gap-1.5 shrink-0">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          {classification ? 'Re-analyse' : 'Analyse'}
        </Button>
      </div>

      {classification && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 font-bold">
              {CATEGORY_ICONS[classification.category as JobCategory]}{' '}
              {CATEGORY_LABELS[classification.category as JobCategory] ?? classification.category}
            </Badge>
            <Badge variant="outline" className={URGENCY_STYLES[classification.urgency]}>
              {classification.urgency} urgency
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.round(classification.confidence * 100)}% confident
            </span>
          </div>
          {classification.summary && (
            <p className="text-xs text-muted-foreground italic">“{classification.summary}”</p>
          )}
          {classification.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {classification.keywords.map((k) => (
                <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {k}
                </span>
              ))}
            </div>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-xl w-full font-bold"
            onClick={() => onApplyCategory(classification.category)}
          >
            Use this category
          </Button>
        </div>
      )}

      {estimate && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-3 rounded-xl bg-background/70 border">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
              <IndianRupee className="h-3 w-3" /> Expected price
            </p>
            <p className="font-bold text-sm mt-1">
              ₹{estimate.cost.low.toLocaleString('en-IN')} – ₹{estimate.cost.high.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Typical ₹{estimate.cost.typical.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-background/70 border">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
              <Clock className="h-3 w-3" /> Expected time
            </p>
            <p className="font-bold text-sm mt-1">
              {estimate.duration_hours.low}–{estimate.duration_hours.high} hrs
            </p>
            <p className="text-[11px] text-muted-foreground">Typical {estimate.duration_hours.typical} hrs</p>
          </div>
          <div className="col-span-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {estimate.basis.cost_source === 'marketplace_history'
                ? `Based on ${estimate.basis.cost_samples} similar jobs on NearWork`
                : 'Based on category baselines until more jobs complete'}
            </p>
            {onApplyBudget && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={() => onApplyBudget(estimate.cost.typical)}
              >
                Use ₹{estimate.cost.typical.toLocaleString('en-IN')}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
