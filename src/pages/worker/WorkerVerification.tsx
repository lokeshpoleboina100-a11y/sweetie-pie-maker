import { useState, useEffect, useRef } from 'react';
import { Upload, FileCheck, Clock, XCircle, Shield, Loader2 } from 'lucide-react';
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
  document_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const DOC_TYPES = [
  { value: 'id_proof', label: 'Government ID (Aadhaar / PAN)' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'skill_certificate', label: 'Skill Certificate' },
  { value: 'police_clearance', label: 'Police Clearance' },
];

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-warning', label: 'Pending Review' },
  approved: { icon: FileCheck, color: 'text-green-600', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-destructive', label: 'Rejected' },
};

export default function WorkerVerification() {
  const { user, profile } = useAuth();
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('id_proof');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchDocs = async () => {
      const { data } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setDocs((data as VerificationDoc[]) || []);
      setLoading(false);
    };
    fetchDocs();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('verification-docs').upload(path, file);
    if (uploadError) {
      toast.error('Upload failed');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('verification-docs').getPublicUrl(path);

    const { data: doc, error } = await supabase.from('verification_documents').insert({
      user_id: user.id,
      document_type: docType,
      document_url: urlData.publicUrl,
    }).select().single();

    if (error) {
      toast.error('Failed to save document');
    } else {
      setDocs((prev) => [doc as VerificationDoc, ...prev]);
      toast.success('Document uploaded for verification');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const approvedCount = docs.filter((d) => d.status === 'approved').length;
  const totalRequired = DOC_TYPES.length;

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
                  ? '✅ Your profile is verified'
                  : `${approvedCount}/${totalRequired} documents approved`}
              </p>
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(approvedCount / totalRequired) * 100}%` }}
            />
          </div>
        </Card>

        {/* Upload new document */}
        <Card className="p-5 space-y-4">
          <h4 className="font-bold">Upload Document</h4>
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
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Choose File & Upload'}
          </Button>
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
