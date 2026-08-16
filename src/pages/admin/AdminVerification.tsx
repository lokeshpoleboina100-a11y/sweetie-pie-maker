import { useState, useEffect } from 'react';
import { Shield, XCircle, Loader2, CheckCircle, ScanSearch, ExternalLink } from 'lucide-react';
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
  storage_path: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface FraudDetails {
  fraud_status: string;
  fraud_score: number | null;
  risk_level: string | null;
  document_authenticity_score: number | null;
  tampering_score: number | null;
  ocr_confidence: number | null;
  document_type_match: boolean | null;
  duplicate_score: number | null;
  fraud_analysis_result: any;
  fraud_analyzed_at: string | null;
}

const DOC_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  driving_licence: 'Driving Licence',
  id_proof: 'Government ID',
  address_proof: 'Address Proof',
  skill_certificate: 'Skill Certificate',
  police_clearance: 'Police Clearance',
};

const RISK_STYLES: Record<string, string> = {
  low: 'bg-green-600/10 text-green-700 dark:text-green-400 border-green-600/30',
  medium: 'bg-warning/10 text-warning border-warning/30',
  high: 'bg-destructive/10 text-destructive border-destructive/30',
};

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${Math.round(Number(v) * 100)}%`;

export default function AdminVerification() {
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'reupload_requested'>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, FraudDetails | null>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDocs = async () => {
      let query = supabase
        .from('verification_documents')
        .select('id, user_id, document_type, document_url, storage_path, status, admin_notes, created_at')
        .order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter);
      const { data } = await query;
      const rows = (data as VerificationDoc[]) || [];
      setDocs(rows);
      setLoading(false);

      const userIds = [...new Set(rows.map((d) => d.user_id))];
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        setNames(Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.full_name])));
      }

      // Pull the safe AI analysis summary for every listed document.
      const results = await Promise.all(
        rows.map(async (d) => {
          const { data: fd } = await supabase.rpc('get_verification_fraud_details', { _doc_id: d.id });
          return [d.id, (fd as unknown as FraudDetails) ?? null] as const;
        }),
      );
      setDetails(Object.fromEntries(results));
    };
    fetchDocs();
  }, [filter]);

  const openDocument = async (doc: VerificationDoc) => {
    const path = doc.storage_path || doc.document_url;
    if (path?.startsWith('http')) {
      window.open(path, '_blank', 'noreferrer');
      return;
    }
    const { data, error } = await supabase.storage
      .from('verification-docs')
      .createSignedUrl(path, 300);
    if (error || !data) {
      toast.error('Could not open document');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noreferrer');
  };

  const loadFraud = async (docId: string) => {
    setLoadingDetails(docId);
    const { data, error } = await supabase.rpc('get_verification_fraud_details', { _doc_id: docId });
    setLoadingDetails(null);
    if (error) {
      toast.error('Could not load AI analysis');
      return;
    }
    setDetails((prev) => ({ ...prev, [docId]: data as unknown as FraudDetails }));
  };

  const updateStatus = async (
    docId: string,
    status: 'approved' | 'rejected' | 'reupload_requested',
    userId: string,
  ) => {
    setUpdating(docId);
    const adminNotes = notes[docId] || '';

    const { error } = await supabase.from('verification_documents').update({
      status,
      admin_notes: adminNotes,
    }).eq('id', docId);

    if (error) {
      setUpdating(null);
      toast.error(error.message || 'Could not update document');
      return;
    }

    if (status === 'approved') {
      const { data: allDocs } = await supabase
        .from('verification_documents')
        .select('id, status')
        .eq('user_id', userId);
      const approved = (allDocs || []).filter((d: any) => d.status === 'approved' || d.id === docId);
      if (approved.length >= 2) {
        await supabase.from('profiles').update({ is_verified: true }).eq('user_id', userId);
      }
    }

    setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, status, admin_notes: adminNotes } : d));
    setUpdating(null);
    toast.success(
      status === 'reupload_requested' ? 'Re-upload requested from the worker' : `Document ${status}`,
    );
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
          {docs.map((doc) => {
            const fd = details[doc.id];
            return (
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

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openDocument(doc)}>
                    <ExternalLink className="h-3 w-3" /> View document
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => loadFraud(doc.id)}
                    disabled={loadingDetails === doc.id}
                  >
                    {loadingDetails === doc.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <ScanSearch className="h-3 w-3" />}
                    AI fraud analysis
                  </Button>
                </div>

                {fd && (
                  <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={RISK_STYLES[fd.risk_level || ''] || ''}>
                        Risk: {fd.risk_level ?? 'unknown'} ({fd.fraud_score ?? '—'})
                      </Badge>
                      <Badge variant="outline">{fd.fraud_status}</Badge>
                      {fd.fraud_analyzed_at && (
                        <span className="text-muted-foreground">
                          {new Date(fd.fraud_analyzed_at).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <span>Authenticity: <strong>{pct(fd.document_authenticity_score)}</strong></span>
                      <span>Tampering: <strong>{pct(fd.tampering_score)}</strong></span>
                      <span>OCR confidence: <strong>{pct(fd.ocr_confidence)}</strong></span>
                      <span>Duplicate: <strong>{pct(fd.duplicate_score)}</strong></span>
                      <span>Type match: <strong>{fd.document_type_match === null ? '—' : fd.document_type_match ? 'Yes' : 'No'}</strong></span>
                      <span>Detected: <strong>{fd.fraud_analysis_result?.detected_type ?? '—'}</strong></span>
                    </div>

                    {Array.isArray(fd.fraud_analysis_result?.risk_indicators) && fd.fraud_analysis_result.risk_indicators.length > 0 && (
                      <div>
                        <p className="font-semibold">Risk indicators</p>
                        <ul className="list-disc pl-4">
                          {fd.fraud_analysis_result.risk_indicators.map((i: string, idx: number) => (
                            <li key={idx}>{i}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {Array.isArray(fd.fraud_analysis_result?.tampering_indicators) && fd.fraud_analysis_result.tampering_indicators.length > 0 && (
                      <div>
                        <p className="font-semibold">Tampering signals</p>
                        <ul className="list-disc pl-4">
                          {fd.fraud_analysis_result.tampering_indicators.map((i: string, idx: number) => (
                            <li key={idx}>{i}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {fd.fraud_analysis_result?.ocr && (
                      <p>
                        OCR name: <strong>{fd.fraud_analysis_result.ocr.name ?? '—'}</strong>
                        {' · '}Doc no: <strong>{fd.fraud_analysis_result.ocr.documentNumberMasked ?? '—'}</strong>
                        {' · '}Name matches account:{' '}
                        <strong>
                          {fd.fraud_analysis_result.name_matches_account === null || fd.fraud_analysis_result.name_matches_account === undefined
                            ? '—'
                            : fd.fraud_analysis_result.name_matches_account ? 'Yes' : 'No'}
                        </strong>
                      </p>
                    )}

                    {fd.fraud_analysis_result?.notes && (
                      <p className="text-muted-foreground">{fd.fraud_analysis_result.notes}</p>
                    )}
                  </div>
                )}

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
            );
          })}
        </div>
      )}
    </div>
  );
}
