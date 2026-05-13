import { useState } from 'react';
import { Sparkles, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  job: any;
  onUseProposal?: (text: string) => void;
}

export default function AIProposalGenerator({ job, onUseProposal }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  const generate = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-marketplace', {
        body: { action: 'generate_proposal', payload: { job, worker: profile } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setText(data.proposal);
    } catch (e: any) {
      toast({ title: 'AI error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Proposal Generator
        </h4>
        <Button size="sm" variant="default" onClick={generate} disabled={loading} className="rounded-xl gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {text ? 'Regenerate' : 'Generate'}
        </Button>
      </div>
      {text && (
        <>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="text-sm" />
          <div className="flex gap-2">
            {onUseProposal && (
              <Button size="sm" className="flex-1 rounded-xl font-bold" onClick={() => onUseProposal(text)}>
                Use this proposal
              </Button>
            )}
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => { navigator.clipboard.writeText(text); toast({ title: 'Copied!' }); }}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
