import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Loader2, Smile, Paperclip, Reply, X, Image as ImageIcon, Mic, Phone, Video } from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';
import VideoCall from '@/components/VideoCall';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useTheme } from '@/components/ThemeProvider';

interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  text: string;
  is_read: boolean | null;
  created_at: string;
  reply_to: string | null;
  reactions: Record<string, string[]> | null;
  attachment_url: string | null;
  attachment_type: string | null;
}

export default function Chat() {
  const { id: jobId } = useParams();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCall, setShowCall] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) || []);
      setLoading(false);

      // Mark unread messages as read
      if (user && data) {
        const unread = data.filter((m: any) => m.sender_id !== user.id && !m.is_read);
        if (unread.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unread.map((m: any) => m.id));
        }
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages:${jobId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `job_id=eq.${jobId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
        // Auto-mark as read if it's from the other user
        if (user && newMsg.sender_id !== user.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `job_id=eq.${jobId}`,
      }, (payload) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } as Message : m))
        );
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.user_id !== user?.id) {
          setOtherTyping(true);
          setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  const broadcastTyping = useCallback(() => {
    if (!jobId || !user) return;
    supabase.channel(`messages:${jobId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id },
    });
  }, [jobId, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      broadcastTyping();
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !jobId) return;
    const text = input.trim();
    setInput('');
    setReplyTo(null);
    setShowEmoji(false);

    await supabase.from('messages').insert({
      job_id: jobId,
      sender_id: user.id,
      text,
      reply_to: replyTo?.id || null,
    });
  };

  const handleEmojiSelect = (emoji: any) => {
    setInput((prev) => prev + emoji.native);
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    const users = reactions[emoji] || [];
    if (users.includes(user.id)) {
      reactions[emoji] = users.filter((u) => u !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, user.id];
    }
    await supabase.from('messages').update({ reactions }).eq('id', msgId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !jobId) return;

    const ext = file.name.split('.').pop();
    const path = `${jobId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file);
    if (error) return;

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const isImage = file.type.startsWith('image/');

    await supabase.from('messages').insert({
      job_id: jobId,
      sender_id: user.id,
      text: isImage ? '📷 Photo' : `📎 ${file.name}`,
      attachment_url: urlData.publicUrl,
      attachment_type: isImage ? 'image' : 'file',
    });
  };

  const handleVoiceSend = async (blob: Blob, durationSec: number) => {
    if (!user || !jobId) return;
    const path = `${jobId}/${Date.now()}.webm`;
    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: 'audio/webm',
    });
    if (error) return;
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    await supabase.from('messages').insert({
      job_id: jobId,
      sender_id: user.id,
      text: `🎤 Voice message (${mins}:${secs.toString().padStart(2, '0')})`,
      attachment_url: urlData.publicUrl,
      attachment_type: 'voice',
    });
  };

  const getReplyMessage = (id: string | null) => messages.find((m) => m.id === id);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <AppHeader title="Chat" showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {showCall && jobId && (
        <VideoCall jobId={jobId} onClose={() => setShowCall(false)} />
      )}
      <AppHeader title="Chat" showBack>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowCall(true)}>
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowCall(true)}>
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </AppHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const reply = getReplyMessage(msg.reply_to);
          const reactions = msg.reactions || {};

          return (
            <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div className="max-w-[75%] group relative">
                {/* Reply preview */}
                {reply && (
                  <div className={cn(
                    'text-xs px-3 py-1.5 rounded-t-xl border-l-2 mb-0.5',
                    isMe ? 'bg-primary/10 border-primary' : 'bg-secondary border-muted-foreground'
                  )}>
                    <span className="font-semibold text-[10px]">
                      {reply.sender_id === user?.id ? 'You' : 'Them'}
                    </span>
                    <p className="truncate">{reply.text}</p>
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm',
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  )}
                >
                  {/* Attachment */}
                  {msg.attachment_url && msg.attachment_type === 'image' && (
                    <img
                      src={msg.attachment_url}
                      alt="Shared"
                      className="rounded-lg mb-2 max-h-48 w-full object-cover cursor-pointer"
                      onClick={() => window.open(msg.attachment_url!, '_blank')}
                    />
                  )}
                  {msg.attachment_url && msg.attachment_type === 'file' && (
                    <a
                      href={msg.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-xs block mb-1"
                    >
                      📎 Download File
                    </a>
                  )}
                  {msg.attachment_url && msg.attachment_type === 'voice' && (
                    <audio
                      src={msg.attachment_url}
                      controls
                      className="mb-2 max-w-[220px]"
                    />
                  )}

                  {msg.text}

                  <div className={cn('flex items-center gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
                    <span className={cn('text-[10px]', isMe ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                      {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span className={cn('text-[10px]', msg.is_read ? 'text-blue-400' : 'text-primary-foreground/40')}>
                        {msg.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {Object.keys(reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded-full border',
                          (users as string[]).includes(user?.id || '') ? 'bg-primary/10 border-primary' : 'bg-secondary border-border'
                        )}
                        onClick={() => handleReaction(msg.id, emoji)}
                      >
                        {emoji} {(users as string[]).length}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick actions on hover */}
                <div className={cn(
                  'absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1',
                  isMe ? '-left-16' : '-right-16'
                )}>
                  <button
                    className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs hover:bg-muted"
                    onClick={() => setReplyTo(msg)}
                    title="Reply"
                  >
                    <Reply className="h-3 w-3" />
                  </button>
                  <button
                    className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs hover:bg-muted"
                    onClick={() => handleReaction(msg.id, '❤️')}
                    title="React"
                  >
                    ❤️
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
              <span className="flex gap-1 items-center">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="border-t border-border px-4 py-2 flex items-center gap-2 bg-secondary/50">
          <Reply className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground truncate flex-1">{replyTo.text}</p>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="border-t border-border">
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme={resolvedTheme}
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={1}
          />
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border p-3 safe-bottom">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => setShowEmoji(!showEmoji)}
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="h-12 rounded-2xl flex-1"
          />
          {input.trim() ? (
            <Button size="icon" className="h-12 w-12 rounded-2xl shrink-0" onClick={handleSend}>
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <VoiceRecorder onSend={handleVoiceSend} />
          )}
        </div>
      </div>
    </div>
  );
}
