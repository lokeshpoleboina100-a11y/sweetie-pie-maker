import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'>;

export default function Chat() {
  const { id: jobId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      setLoading(false);
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`messages:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || !jobId) return;
    const text = input.trim();
    setInput('');

    await supabase.from('messages').insert({
      job_id: jobId,
      sender_id: user.id,
      text,
    });
  };

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
      <AppHeader title="Chat" showBack />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-secondary-foreground rounded-bl-md'
                )}
              >
                {msg.text}
                <p className={cn('text-[10px] mt-1', isMe ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                  {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 safe-bottom">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="h-12 rounded-2xl flex-1"
          />
          <Button size="icon" className="h-12 w-12 rounded-2xl shrink-0" onClick={handleSend} disabled={!input.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
