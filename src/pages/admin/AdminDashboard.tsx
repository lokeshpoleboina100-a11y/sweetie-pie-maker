import { useState, useEffect } from 'react';
import { useNavigate, NavLink as RouterNavLink, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, LogOut, Shield, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ThemeToggle from '@/components/ThemeToggle';
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminJobs from './AdminJobs';
import AdminVerification from './AdminVerification';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Jobs', path: '/admin/jobs', icon: Briefcase },
  { label: 'Verification', path: '/admin/verification', icon: Shield },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-extrabold">Admin</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </RouterNavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive"
          onClick={async () => { await signOut(); navigate('/'); }}
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check admin role via the has_role function
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' } as any).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border flex-col bg-card">
        <NavContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-14 bg-card/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <NavContent onNavigate={() => setSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold lg:hidden">Admin</h1>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="verification" element={<AdminVerification />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
