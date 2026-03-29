import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChatPreview {
  jobId: string;
  jobTitle: string;
  lastMessage: string;
  lastTime: string;
  otherName: string;
}

export default function CustomerChats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      // Get all jobs with accepted workers (customer's jobs that have active chats)
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, accepted_worker_id')
        .eq('customer_id', user.id)
        .not('accepted_worker_id', 'is', null);

      if (!jobs || jobs.length === 0) {
        setLoading(false);
        return;
      }

      const chatPreviews: ChatPreview[] = [];
      for (const job of jobs) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('text, created_at')
          .eq('job_id', job.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const { data: workerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', job.accepted_worker_id!)
          .single();

        chatPreviews.push({
          jobId: job.id,
          jobTitle: job.title,
          lastMessage: msgs?.[0]?.text || 'No messages yet',
          lastTime: msgs?.[0]?.created_at
            ? new Date(msgs[0].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : '',
          otherName: workerProfile?.full_name || 'Worker',
        });
      }
      setChats(chatPreviews);
      setLoading(false);
    };
    fetchChats();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Messages" />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chats.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">No active chats. Accept a bid to start chatting!</p>
        ) : (
          chats.map((chat) => (
            <Card
              key={chat.jobId}
              className="flex items-center gap-3 p-4 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/customer/chat/${chat.jobId}`)}
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {chat.otherName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">{chat.otherName}</h4>
                  <span className="text-xs text-muted-foreground">{chat.lastTime}</span>
                </div>
                <p className="text-xs text-muted-foreground">{chat.jobTitle}</p>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
              </div>
            </Card>
          ))
        )}
      </div>
      <BottomNav role="customer" />
    </div>
  );
}
