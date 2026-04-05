import { useState, useEffect } from 'react';
import { Shield, FileCheck, Clock, XCircle, Loader2, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VerificationDoc {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const DOC_LABELS: Record<string, string> = {
  id_proof: 'Government ID',
  address_proof: 'Address Proof',
  skill_certificate: 'Skill Certificate',
  police_clearance: 'Police Clearance',
};

export default function AdminVerification() {
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      let query = supabase.from('verification_documents').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter);
      const { data } = await query;
      setDocs((data as VerificationDoc[]) || []);
      setLoading(false);
    };
    fetchDocs();
  }, [filter]);

  const updateStatus = async (docId: string, status: 'approved' | 'rejected', userId: string) => {
    setUpdating(docId);
    const adminNotes = notes[docId] || '';

    await supabase.from('verification_documents').update({
      status,
      admin_notes: adminNotes,
    }).eq('id', docId);

    // If approved, check if all docs are approved and mark user as verified
    if (status === 'approved') {
      const { data: allDocs } = await supabase
        .from('verification_documents')
        .select('status')
        .eq('user_id', userId);
      const allApproved = allDocs?.every((d: any) => d.status === 'approved' || d.id === docId);
      if (allApproved && (allDocs?.length || 0) >= 2) {
        await supabase.from('profiles').update({ is_verified: true }).eq('user_id', userId);
      }
    }

    setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, status, admin_notes: adminNotes } : d));
    setUpdating(null);
    toast.success(`Document ${status}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" /> Verification Queue
        </h2>
      </div>

      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilter(f); setLoading(true); }}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : docs.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No documents found.</p>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => (
            <Card key={doc.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{DOC_LABELS[doc.document_type] || doc.document_type}</p>
                  <p className="text-xs text-muted-foreground">
                    User: {doc.user_id.slice(0, 8)}… | {new Date(doc.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <Badge variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                  {doc.status}
                </Badge>
              </div>

              <a
                href={doc.document_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                View Document →
              </a>

              {doc.status === 'pending' && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Admin notes (optional)..."
                    value={notes[doc.id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                    className="text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => updateStatus(doc.id, 'approved', doc.user_id)}
                      disabled={updating === doc.id}
                    >
                      {updating === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => updateStatus(doc.id, 'rejected', doc.user_id)}
                      disabled={updating === doc.id}
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
