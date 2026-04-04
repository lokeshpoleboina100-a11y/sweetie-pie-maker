import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Camera, ChevronLeft, ChevronRight, Eye, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string;
  viewers: string[];
  created_at: string;
  expires_at: string;
}

interface StoryGroup {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  stories: Story[];
  hasUnviewed: boolean;
}

export default function Stories() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [caption, setCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
  }, [user]);

  const fetchStories = async () => {
    if (!user) return;
    const { data: stories } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (!stories || stories.length === 0) {
      setStoryGroups([]);
      setLoading(false);
      return;
    }

    // Group by user
    const userIds = [...new Set(stories.map((s: any) => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

    const groups: StoryGroup[] = userIds.map((uid) => {
      const userStories = stories.filter((s: any) => s.user_id === uid) as Story[];
      const p = profileMap.get(uid);
      return {
        userId: uid,
        userName: p?.full_name || 'User',
        avatarUrl: p?.avatar_url || null,
        stories: userStories,
        hasUnviewed: userStories.some((s) => !s.viewers?.includes(user.id)),
      };
    });

    // Put current user first
    const myGroup = groups.find((g) => g.userId === user.id);
    const otherGroups = groups.filter((g) => g.userId !== user.id);
    setStoryGroups(myGroup ? [myGroup, ...otherGroups] : otherGroups);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowCaptionInput(true);
  };

  const handleUploadStory = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);

    const ext = selectedFile.name.split('.').pop();
    const path = `stories/${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, selectedFile);
    if (uploadErr) {
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const isVideo = selectedFile.type.startsWith('video/');

    await supabase.from('stories').insert({
      user_id: user.id,
      media_url: urlData.publicUrl,
      media_type: isVideo ? 'video' : 'image',
      caption: caption,
    });

    setCaption('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowCaptionInput(false);
    setUploading(false);
    fetchStories();
  };

  const openStory = (group: StoryGroup) => {
    setViewingGroup(group);
    setViewIndex(0);
    setProgress(0);
  };

  const closeStory = () => {
    setViewingGroup(null);
    clearInterval(timerRef.current);
  };

  // Auto-advance story every 5s
  useEffect(() => {
    if (!viewingGroup) return;
    clearInterval(timerRef.current);
    setProgress(0);

    // Mark as viewed
    const story = viewingGroup.stories[viewIndex];
    if (story && user && !story.viewers?.includes(user.id)) {
      supabase
        .from('stories')
        .update({ viewers: [...(story.viewers || []), user.id] })
        .eq('id', story.id)
        .then();
    }

    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / 5000) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current);
        if (viewIndex < viewingGroup.stories.length - 1) {
          setViewIndex((i) => i + 1);
        } else {
          closeStory();
        }
      }
    }, 50);

    return () => clearInterval(timerRef.current);
  }, [viewingGroup, viewIndex]);

  const nextStory = () => {
    if (!viewingGroup) return;
    if (viewIndex < viewingGroup.stories.length - 1) {
      setViewIndex((i) => i + 1);
    } else {
      closeStory();
    }
  };

  const prevStory = () => {
    if (viewIndex > 0) setViewIndex((i) => i - 1);
  };

  const deleteStory = async (storyId: string) => {
    await supabase.from('stories').delete().eq('id', storyId);
    closeStory();
    fetchStories();
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  };

  const role = profile?.role || 'customer';

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Status" showBack />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Upload preview */}
        {showCaptionInput && previewUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-2xl overflow-hidden border border-border">
            <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-cover" />
            <div className="p-4 space-y-3">
              <Input
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="rounded-xl"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowCaptionInput(false); setSelectedFile(null); setPreviewUrl(null); }}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2" onClick={handleUploadStory} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {uploading ? 'Posting...' : 'Post Status'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* My Status */}
        <div className="mb-6">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              const myGroup = storyGroups.find((g) => g.userId === user?.id);
              if (myGroup && myGroup.stories.length > 0) {
                openStory(myGroup);
              } else {
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-dashed border-primary">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {profile?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                <Plus className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <div>
              <p className="font-bold text-sm">My Status</p>
              <p className="text-xs text-muted-foreground">
                {storyGroups.find((g) => g.userId === user?.id)?.stories.length
                  ? `${storyGroups.find((g) => g.userId === user?.id)!.stories.length} status updates`
                  : 'Tap to add status update'}
              </p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Other stories */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent updates</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : storyGroups.filter((g) => g.userId !== user?.id).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No status updates from others yet.</p>
          ) : (
            <div className="space-y-3">
              {storyGroups
                .filter((g) => g.userId !== user?.id)
                .map((group) => (
                  <div
                    key={group.userId}
                    className="flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => openStory(group)}
                  >
                    <div className={cn('rounded-full p-0.5', group.hasUnviewed ? 'bg-gradient-to-tr from-primary to-accent' : 'bg-muted')}>
                      <Avatar className="h-12 w-12 border-2 border-background">
                        <AvatarImage src={group.avatarUrl || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {group.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{group.userName}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(group.stories[group.stories.length - 1].created_at)} ago</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Story viewer modal */}
      <AnimatePresence>
        {viewingGroup && viewingGroup.stories[viewIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            {/* Progress bars */}
            <div className="flex gap-1 px-3 pt-3">
              {viewingGroup.stories.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: i < viewIndex ? '100%' : i === viewIndex ? `${progress}%` : '0%' }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={viewingGroup.avatarUrl || ''} />
                <AvatarFallback className="bg-white/20 text-white text-xs">{viewingGroup.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{viewingGroup.userName}</p>
                <p className="text-white/60 text-xs">{timeAgo(viewingGroup.stories[viewIndex].created_at)} ago</p>
              </div>
              <div className="flex items-center gap-2">
                {viewingGroup.userId === user?.id && (
                  <>
                    <div className="flex items-center gap-1 text-white/70">
                      <Eye className="h-4 w-4" />
                      <span className="text-xs">{viewingGroup.stories[viewIndex].viewers?.length || 0}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => deleteStory(viewingGroup.stories[viewIndex].id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={closeStory}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Story content */}
            <div className="flex-1 flex items-center justify-center relative" onClick={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x < rect.width / 2) prevStory();
              else nextStory();
            }}>
              {viewingGroup.stories[viewIndex].media_type === 'video' ? (
                <video src={viewingGroup.stories[viewIndex].media_url} className="max-h-full max-w-full object-contain" autoPlay muted />
              ) : (
                <img src={viewingGroup.stories[viewIndex].media_url} alt="Story" className="max-h-full max-w-full object-contain" />
              )}

              {/* Navigation arrows */}
              {viewIndex > 0 && (
                <button className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); prevStory(); }}>
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
              )}
              {viewIndex < viewingGroup.stories.length - 1 && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); nextStory(); }}>
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              )}
            </div>

            {/* Caption */}
            {viewingGroup.stories[viewIndex].caption && (
              <div className="px-6 py-4 text-center">
                <p className="text-white text-sm">{viewingGroup.stories[viewIndex].caption}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav role={role} />
    </div>
  );
}
