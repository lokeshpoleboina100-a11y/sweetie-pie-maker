import { useEffect } from 'react';
import { useNotifications } from '@/hooks/use-notifications';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { requestPermission } = useNotifications();

  useEffect(() => {
    // Request permission after a short delay so the app feels ready
    const timer = setTimeout(() => {
      requestPermission();
    }, 3000);
    return () => clearTimeout(timer);
  }, [requestPermission]);

  return <>{children}</>;
}
