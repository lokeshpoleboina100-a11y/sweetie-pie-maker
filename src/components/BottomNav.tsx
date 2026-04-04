import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MessageSquare, User, Plus, Briefcase, Wallet, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';
import { useTranslation } from 'react-i18next';

interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  path: string;
}

const customerNav: NavItem[] = [
  { icon: Home, labelKey: 'nav.home', path: '/customer' },
  { icon: Plus, labelKey: 'nav.post_job', path: '/customer/post-job' },
  { icon: CircleDot, labelKey: 'nav.status', path: '/stories' },
  { icon: MessageSquare, labelKey: 'nav.chat', path: '/customer/chats' },
  { icon: User, labelKey: 'nav.profile', path: '/customer/profile' },
];

const workerNav: NavItem[] = [
  { icon: Search, labelKey: 'nav.jobs', path: '/worker' },
  { icon: Briefcase, labelKey: 'nav.my_jobs', path: '/worker/my-jobs' },
  { icon: CircleDot, labelKey: 'nav.status', path: '/stories' },
  { icon: Wallet, labelKey: 'nav.earnings', path: '/worker/earnings' },
  { icon: User, labelKey: 'nav.profile', path: '/worker/profile' },
];

export default function BottomNav({ role }: { role: UserRole }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const items = role === 'customer' ? customerNav : workerNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-6 w-6', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-semibold">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
