import { ArrowLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  showNotifications?: boolean;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

export default function AppHeader({ title, showBack, showNotifications = false, right, children }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-bold truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {children}
          <ThemeToggle />
          {right}
          {showNotifications && (
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
