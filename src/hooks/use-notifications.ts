import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const showNotification = useCallback((title: string, body: string, url?: string) => {
    // In-app toast
    toast({ title, description: body });

    // Browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
      });
      if (url) {
        n.onclick = () => {
          window.focus();
          window.location.href = url;
        };
      }
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;

    // Listen for new bids on user's jobs
    const bidChannel = supabase
      .channel('bid-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bids',
      }, (payload) => {
        // Check if this bid is for one of the current user's jobs
        supabase.from('jobs').select('customer_id, title').eq('id', payload.new.job_id).single()
          .then(({ data }) => {
            if (data?.customer_id === user.id) {
              showNotification(
                'New Bid Received! 🎉',
                `Someone bid ₹${payload.new.amount} on "${data.title}"`,
                `/customer/job/${payload.new.job_id}`
              );
            }
          });
      })
      .subscribe();

    // Listen for new messages
    const msgChannel = supabase
      .channel('msg-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        if (payload.new.sender_id !== user.id) {
          showNotification(
            'New Message 💬',
            payload.new.text?.substring(0, 100) || 'You have a new message',
            `/customer/chat/${payload.new.job_id}`
          );
        }
      })
      .subscribe();

    // Listen for job status changes (for workers)
    const jobChannel = supabase
      .channel('job-notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
      }, (payload) => {
        if (payload.new.accepted_worker_id === user.id && payload.old.accepted_worker_id !== user.id) {
          showNotification(
            'Job Accepted! 🎊',
            `You've been selected for "${payload.new.title}"`,
            `/worker/job/${payload.new.id}`
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bidChannel);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(jobChannel);
    };
  }, [user, showNotification]);

  return { requestPermission };
}
