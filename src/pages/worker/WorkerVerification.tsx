import { useState, useEffect, useRef } from 'react';
import { Upload, FileCheck, Clock, XCircle, Shield, Loader2, ScanSearch, AlertTriangle } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VerificationDoc {
  id: string;
  document_type: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const DOC_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'driving_licence', label: 'Driving Licence' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'skill_certificate', label: 'Skill Certificate' },
  { value: 'police_clearance', label: 'Police Clearance' },
];

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-warning', label: 'Pending Review' },
  approved: { icon: FileCheck, color: 'text-green-600', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-destructive', label: 'Rejected' },
};

const SELECT_COLS = 'id, document_type, status, admin_notes, created_at';

export default function WorkerVerification() {
  const { user, profile } = useAuth();
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [screenResult, setScreenResult] = useState<{ status: string; message: string } | null>(null);
  const [docType, setDocType] = useState('aadhaar');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchDocs = async () => {
      const { data } = await supabase
        .from('verification_documents')
        .select(SELECT_COLS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setDocs((data as VerificationDoc[]) || []);
      setLoading(false);
    };
    fetchDocs();
  }, [user]);

  const refreshDocs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('verification_documents')
      .select(SELECT_COLS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDocs((data as VerificationDoc[]) || []);
  };

  const openPicker = () => {
    if (uploading || analyzing) return;
    const input = fileRef.current;
    if (!input) return;
    // Reset so re-selecting the same file still fires onChange
    input.value = '';
    input.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      toast.error('Please sign in to upload documents');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setFileName(file.name);
    setScreenResult(null);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) {
        toast.error(uploadError.message || 'Upload failed');
        return;
      }

      const { data: doc, error } = await supabase
        .from('verification_documents')
        .insert({
          user_id: user.id,
          document_type: docType,
          document_url: path,
          storage_path: path,
        })
        .select(SELECT_COLS)
        .single();

      if (error || !doc) {
        toast.error(error?.message || 'Failed to save document');
        return;
      }

      setDocs((prev) => [doc as VerificationDoc, ...prev]);
      toast.success('Document uploaded — running AI security check');

      setUploading(false);
      setAnalyzing(true);
      const { data: result, error: fnError } = await supabase.functions.invoke('verification-analyze', {
        body: { documentId: (doc as VerificationDoc).id },
      });

      setScreenResult(
        fnError
          ? {
              status: 'review',
              message: 'We could not complete the automatic check. Our team will review your document manually.',
            }
          : {
              status: (result as any)?.status ?? 'review',
              message: (result as any)?.message ?? 'Your document is under review.',
            }
      );
      await refreshDocs();
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong while uploading');
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };


  const approvedCount = docs.filter((d) => d.status === 'approved').length;
  const totalRequired = 2;

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Verification" showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Status overview */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Verification Status</h3>
              <p className="text-sm text-muted-foreground">
                {profile?.is_verified
                  ? 'Your profile is verified'
                  : `${Math.min(approvedCount, totalRequired)}/${totalRequired} documents approved`}
              </p>
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (approvedCount / totalRequired) * 100)}%` }}
            />
          </div>
        </Card>

        {/* Upload new document */}
        <Card className="p-5 space-y-4">
          <h4 className="font-bold">Upload Document</h4>
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <ScanSearch className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            Every upload is screened by AI for tampering, readability and duplicates before an admin reviews it.
          </p>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((dt) => (
                <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="file"
            ref={fileRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleUpload}
          />
          <Button
            className="w-full gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || analyzing}
          >
            {uploading || analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading...' : analyzing ? 'Running AI security check...' : 'Choose File & Upload'}
          </Button>

          {screenResult && (
            <div
              className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
                screenResult.status === 'passed'
                  ? 'border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400'
                  : screenResult.status === 'failed'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-warning/30 bg-warning/10 text-warning'
              }`}
            >
              {screenResult.status === 'passed' ? (
                <FileCheck className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{screenResult.message}</span>
            </div>
          )}
        </Card>

        {/* Submitted documents */}
        <div className="space-y-3">
          <h4 className="font-bold">Submitted Documents</h4>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No documents uploaded yet. Upload your first document above.
            </p>
          ) : (
            docs.map((doc) => {
              const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const typeLabel = DOC_TYPES.find((d) => d.value === doc.document_type)?.label || doc.document_type;

              return (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{typeLabel}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString('en-IN')}
                      </p>
                      {doc.admin_notes && doc.status === 'rejected' && (
                        <p className="text-xs text-destructive mt-1">Note: {doc.admin_notes}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={`gap-1 ${cfg.color} shrink-0`}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </Badge>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
