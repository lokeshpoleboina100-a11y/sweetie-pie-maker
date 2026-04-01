import { useState, useRef } from 'react';
import { Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  className?: string;
}

export default function AvatarUpload({ className }: AvatarUploadProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

      // Update profile
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', user.id);
      await refreshProfile();

      toast({ title: 'Photo updated!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} />
      <Avatar className="h-20 w-20 cursor-pointer" onClick={() => fileRef.current?.click()}>
        {profile?.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
        ) : null}
        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
          {(profile?.full_name || 'U').charAt(0)}
        </AvatarFallback>
      </Avatar>
      <button
        className={cn(
          'absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background',
          uploading && 'animate-pulse'
        )}
        onClick={() => fileRef.current?.click()}
      >
        <Camera className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
