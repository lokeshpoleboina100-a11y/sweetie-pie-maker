import { useEffect, useState } from 'react';
import {
  Sparkles,
  Loader2,
  Wand2,
  IndianRupee,
  Clock,
  ChevronDown,
  Info,
  ThumbsUp,
  ThumbsDown,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { classifyIssue, estimateJob, type IssueClassification, type JobEstimate } from '@/services/ai';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACTIVE_CATEGORIES, CATEGORY_ICONS, CATEGORY_LABELS, JobCategory } from '@/lib/types';

/** Serialisable snapshot of the AI reasoning, saved with the job and exportable. */
export interface AiExplanation {
  version: 1;
  generated_at: string;
  input: { title: string; description: string };
  category: string;
  category_label: string;
  urgency: string;
  confidence: number;
  method: string;
  keywords: string[];
  summary?: string;
  estimate?: JobEstimate | null;
  feedback?: {
    vote: 'up' | 'down' | 'wrong_category';
    corrected_category?: string;
    corrected_urgency?: string;
  } | null;
}

interface Props {
  title: string;
  description: string;
  /** Called when the customer accepts the AI-detected category. */
  onApplyCategory: (category: string) => void;
  /** Called when the customer accepts the suggested typical price. */
  onApplyBudget?: (amount: number) => void;
  /** Fires whenever the explanation changes so the parent can persist it with the job. */
  onExplanationChange?: (explanation: AiExplanation | null) => void;
}

const URGENCY_STYLES: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  normal: 'bg-primary/10 text-primary border-primary/25',
  low: 'bg-muted text-muted-foreground border-border',
};

const URGENCIES = ['low', 'normal', 'high'] as const;

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function AIJobAssistant({
  title,
  description,
  onApplyCategory,
  onApplyBudget,
  onExplanationChange,
}: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [classification, setClassification] = useState<IssueClassification | null>(null);
  const [estimate, setEstimate] = useState<JobEstimate | null>(null);
  const [vote, setVote] = useState<'up' | 'down' | 'wrong_category' | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [fixCategory, setFixCategory] = useState<string>('');
  const [fixUrgency, setFixUrgency] = useState<string>('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  const text = `${title} ${description}`.trim();

  const buildExplanation = (
    cls: IssueClassification | null,
    est: JobEstimate | null,
    fb: AiExplanation['feedback'] = null,
  ): AiExplanation | null => {
    if (!cls) return null;
    return {
      version: 1,
      generated_at: new Date().toISOString(),
      input: { title, description },
      category: cls.category,
      category_label: CATEGORY_LABELS[cls.category as JobCategory] ?? cls.category,
      urgency: cls.urgency,
      confidence: cls.confidence,
      method: cls.method,
      keywords: cls.keywords ?? [],
      summary: cls.summary,
      estimate: est,
      feedback: fb,
    };
  };

  // Keep the parent in sync so the explanation is stored on the job record.
  useEffect(() => {
    onExplanationChange?.(
      buildExplanation(
        classification,
        estimate,
        vote
          ? { vote, corrected_category: fixCategory || undefined, corrected_urgency: fixUrgency || undefined }
          : null,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classification, estimate, vote, fixCategory, fixUrgency]);

  const analyse = async () => {
    if (text.length < 5) {
      toast({ title: 'Add a few more details', description: 'Describe the problem so the AI can analyse it.' });
      return;
    }
    setLoading(true);
    setVote(null);
    setShowCorrection(false);
    setFixCategory('');
    setFixUrgency('');
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

  const sendFeedback = async (
    kind: 'up' | 'down' | 'wrong_category',
    corrections?: { category?: string; urgency?: string },
  ) => {
    if (!classification) return;
    setVote(kind);
    setSavingFeedback(true);
    try {
      if (user) {
        const { error } = await supabase.from('ai_feedback').insert({
          user_id: user.id,
          feature: 'job_classification',
          vote: kind,
          ai_category: classification.category,
          ai_urgency: classification.urgency,
          corrected_category: corrections?.category ?? null,
          corrected_urgency: corrections?.urgency ?? null,
          explanation: buildExplanation(classification, estimate) as any,
        });
        if (error) throw error;
      }
      if (corrections?.category) {
        onApplyCategory(corrections.category);
        setClassification({ ...classification, category: corrections.category });
      }
      if (corrections?.urgency) {
        setClassification((prev) => (prev ? { ...prev, urgency: corrections.urgency as any } : prev));
      }
      toast({
        title: 'Thanks for the feedback',
        description:
          kind === 'up'
            ? 'Noted — this helps improve future matches.'
            : 'We saved your correction and will use it to improve the model.',
      });
      setShowCorrection(false);
    } catch (e: any) {
      toast({ title: 'Could not save feedback', description: e.message, variant: 'destructive' });
    } finally {
      setSavingFeedback(false);
    }
  };

  const exportExplanation = () => {
    const payload = buildExplanation(
      classification,
      estimate,
      vote ? { vote, corrected_category: fixCategory || undefined, corrected_urgency: fixUrgency || undefined } : null,
    );
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nearwork-ai-explanation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Explanation exported', description: 'A JSON audit summary was downloaded.' });
  };

  const inputs = estimate?.inputs;

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

          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-xl border bg-background/60 px-3 py-2 text-xs font-semibold hover:bg-background">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" /> Why this category & urgency?
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-3 rounded-xl border bg-background/60 p-3">
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span>Classification confidence</span>
                  <span>{Math.round(classification.confidence * 100)}%</span>
                </div>
                <Progress value={Math.round(classification.confidence * 100)} className="h-1.5 mt-1" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {classification.method === 'llm'
                    ? 'Detected by the AI language model reading your title and description.'
                    : 'Detected by keyword matching (AI model unavailable), so double-check the category.'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold">Signals used from your text</p>
                {classification.keywords?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {classification.keywords.map((k) => (
                      <span
                        key={`why-${k}`}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No strong keywords found — add more detail for a sharper match.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold">
                  Urgency: <span className="capitalize">{classification.urgency}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {classification.urgency === 'high'
                    ? 'Your wording suggests an emergency or same-day need, so pricing leans toward the higher band.'
                    : classification.urgency === 'low'
                      ? 'Your wording suggests this can be scheduled later, which keeps the price band lower.'
                      : 'No emergency wording found, so this is treated as a standard scheduled job.'}
                </p>
              </div>

              {estimate && (
                <div className="space-y-1 border-t pt-2">
                  <p className="text-[11px] font-semibold">How the estimate was built</p>
                  <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                    <li>
                      Price:{' '}
                      {estimate.basis.cost_source === 'marketplace_history'
                        ? `${estimate.basis.cost_samples} similar accepted/paid jobs in ${
                            CATEGORY_LABELS[estimate.category as JobCategory] ?? estimate.category
                          }`
                        : 'category baseline (not enough completed jobs yet)'}
                    </li>
                    <li>
                      Duration:{' '}
                      {estimate.basis.duration_source === 'marketplace_history'
                        ? `${estimate.basis.duration_samples} past jobs`
                        : 'category baseline'}
                    </li>
                    <li>Urgency multiplier applied: {estimate.basis.urgency}</li>
                    <li>Estimate confidence: {Math.round(estimate.confidence * 100)}%</li>
                  </ul>
                </div>
              )}

              {inputs && (
                <div className="space-y-2 border-t pt-2">
                  <p className="text-[11px] font-semibold">Estimate inputs (audit view)</p>

                  <div className="rounded-lg border bg-muted/40 p-2 space-y-1">
                    <p className="text-[11px] font-semibold">Price band</p>
                    {inputs.cost.p50 !== null ? (
                      <p className="text-[11px] text-muted-foreground">
                        Percentiles from history — p25 {money(inputs.cost.p25!)}, p50 {money(inputs.cost.p50)}, p75{' '}
                        {money(inputs.cost.p75!)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Default baseline used: {money(inputs.cost.baseline[0])} – {money(inputs.cost.baseline[1])}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Records used: {inputs.cost.records_used.completed_payments} completed payments,{' '}
                      {inputs.cost.records_used.accepted_bids} accepted bids (minimum{' '}
                      {inputs.cost.records_used.minimum_required} needed for history-based pricing)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Urgency multiplier on the upper band: ×{inputs.urgency_multiplier}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/40 p-2 space-y-1">
                    <p className="text-[11px] font-semibold">Duration band</p>
                    {inputs.duration_hours.p50 !== null ? (
                      <p className="text-[11px] text-muted-foreground">
                        Percentiles from history — p25 {inputs.duration_hours.p25}h, p50 {inputs.duration_hours.p50}h,
                        p75 {inputs.duration_hours.p75}h
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Default baseline used: {inputs.duration_hours.baseline[0]}–{inputs.duration_hours.baseline[1]}{' '}
                        hrs
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Records used: {inputs.duration_hours.records_used.completed_jobs} completed jobs of{' '}
                      {inputs.history_jobs_scanned} scanned (minimum{' '}
                      {inputs.duration_hours.records_used.minimum_required} needed)
                    </p>
                  </div>
                </div>
              )}

              {/* Feedback controls */}
              <div className="space-y-2 border-t pt-2">
                <p className="text-[11px] font-semibold">Was this analysis correct?</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={vote === 'up' ? 'default' : 'outline'}
                    className="rounded-xl gap-1 h-8 text-[11px]"
                    disabled={savingFeedback}
                    onClick={() => sendFeedback('up')}
                  >
                    <ThumbsUp className="h-3 w-3" /> Looks right
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={vote === 'down' ? 'default' : 'outline'}
                    className="rounded-xl gap-1 h-8 text-[11px]"
                    disabled={savingFeedback}
                    onClick={() => sendFeedback('down')}
                  >
                    <ThumbsDown className="h-3 w-3" /> Not helpful
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={showCorrection || vote === 'wrong_category' ? 'secondary' : 'outline'}
                    className="rounded-xl gap-1 h-8 text-[11px]"
                    onClick={() => setShowCorrection((s) => !s)}
                  >
                    <AlertCircle className="h-3 w-3" /> Wrong category
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1 h-8 text-[11px]"
                    onClick={exportExplanation}
                  >
                    <Download className="h-3 w-3" /> Export explanation
                  </Button>
                </div>

                {showCorrection && (
                  <div className="space-y-2 rounded-lg border bg-muted/40 p-2">
                    <p className="text-[11px] font-semibold">Pick the correct values</p>
                    <Select value={fixCategory} onValueChange={setFixCategory}>
                      <SelectTrigger className="h-9 text-xs rounded-lg">
                        <SelectValue placeholder="Correct category" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={fixUrgency} onValueChange={setFixUrgency}>
                      <SelectTrigger className="h-9 text-xs rounded-lg">
                        <SelectValue placeholder="Correct urgency (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCIES.map((u) => (
                          <SelectItem key={u} value={u} className="text-xs capitalize">
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full rounded-xl h-9 text-xs font-bold"
                      disabled={savingFeedback || !fixCategory}
                      onClick={() =>
                        sendFeedback('wrong_category', {
                          category: fixCategory,
                          urgency: fixUrgency || undefined,
                        })
                      }
                    >
                      {savingFeedback ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      Submit correction & apply
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
