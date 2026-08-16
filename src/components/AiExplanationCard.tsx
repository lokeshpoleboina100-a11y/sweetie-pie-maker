import { Download, Info, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { AiExplanation } from '@/components/AIJobAssistant';
import { CATEGORY_ICONS, CATEGORY_LABELS, JobCategory } from '@/lib/types';

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Read-only view of the AI explanation saved on a job record. */
export default function AiExplanationCard({ explanation }: { explanation: AiExplanation }) {
  const est = explanation.estimate;
  const inputs = est?.inputs;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(explanation, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nearwork-ai-explanation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4 space-y-3 border-primary/25 bg-primary/5 rounded-2xl">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI analysis for this job
        </h3>
        <Button type="button" size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-[11px]" onClick={exportJson}>
          <Download className="h-3 w-3" /> Export
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-bold">
          {CATEGORY_ICONS[explanation.category as JobCategory]}{' '}
          {explanation.category_label || CATEGORY_LABELS[explanation.category as JobCategory] || explanation.category}
        </Badge>
        <Badge variant="outline" className="capitalize">{explanation.urgency} urgency</Badge>
        <span className="text-xs text-muted-foreground">
          {Math.round((explanation.confidence ?? 0) * 100)}% confident ·{' '}
          {explanation.method === 'llm' ? 'AI model' : 'keyword fallback'}
        </span>
      </div>

      <Progress value={Math.round((explanation.confidence ?? 0) * 100)} className="h-1.5" />

      {explanation.summary && <p className="text-xs italic text-muted-foreground">“{explanation.summary}”</p>}

      {explanation.keywords?.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold flex items-center gap-1">
            <Info className="h-3 w-3 text-primary" /> Signals used
          </p>
          <div className="flex flex-wrap gap-1">
            {explanation.keywords.map((k) => (
              <span
                key={k}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {est && (
        <div className="space-y-1 border-t pt-2 text-[11px] text-muted-foreground">
          <p className="font-semibold text-foreground">Estimate at posting time</p>
          <p>
            Price {money(est.cost.low)} – {money(est.cost.high)} (typical {money(est.cost.typical)}) ·{' '}
            {est.duration_hours.low}–{est.duration_hours.high} hrs
          </p>
          <p>
            Price source: {est.basis.cost_source === 'marketplace_history'
              ? `${est.basis.cost_samples} historical records`
              : 'category baseline'}{' '}
            · Duration source: {est.basis.duration_source === 'marketplace_history'
              ? `${est.basis.duration_samples} historical records`
              : 'category baseline'}
          </p>
          {inputs && (
            <p>
              {inputs.cost.p50 !== null
                ? `Price percentiles p25 ${money(inputs.cost.p25!)} / p50 ${money(inputs.cost.p50)} / p75 ${money(inputs.cost.p75!)}`
                : `Baseline band ${money(inputs.cost.baseline[0])} – ${money(inputs.cost.baseline[1])}`}
              {' · '}
              {inputs.duration_hours.p50 !== null
                ? `Duration p25 ${inputs.duration_hours.p25}h / p50 ${inputs.duration_hours.p50}h / p75 ${inputs.duration_hours.p75}h`
                : `Duration baseline ${inputs.duration_hours.baseline[0]}–${inputs.duration_hours.baseline[1]}h`}
              {' · '}Urgency ×{inputs.urgency_multiplier}
            </p>
          )}
        </div>
      )}

      {explanation.feedback && (
        <p className="text-[11px] text-muted-foreground border-t pt-2">
          Your feedback: <strong className="capitalize">{explanation.feedback.vote.replace('_', ' ')}</strong>
          {explanation.feedback.corrected_category
            ? ` · corrected to ${CATEGORY_LABELS[explanation.feedback.corrected_category as JobCategory] ?? explanation.feedback.corrected_category}`
            : ''}
          {explanation.feedback.corrected_urgency ? ` · urgency ${explanation.feedback.corrected_urgency}` : ''}
        </p>
      )}
    </Card>
  );
}
