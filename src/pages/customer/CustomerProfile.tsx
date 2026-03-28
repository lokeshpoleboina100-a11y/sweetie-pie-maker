import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, Star, Clock, CreditCard, HelpCircle } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: Clock, label: 'Job History', path: '/customer' },
  { icon: Star, label: 'My Reviews', path: '/customer' },
  { icon: CreditCard, label: 'Payments', path: '/customer' },
  { icon: HelpCircle, label: 'Help & Support', path: '/customer' },
];

export default function CustomerProfile() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Profile" />
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">P</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-lg">Priya M.</h2>
            <p className="text-sm text-muted-foreground">+91 98765 43210</p>
          </div>
        </div>

        <div className="space-y-2">
          {menuItems.map((item) => (
            <Card
              key={item.label}
              className="flex items-center justify-between p-4 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-sm">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          ))}
        </div>

        <Button
          variant="ghost"
          className="w-full mt-6 text-destructive font-bold gap-2"
          onClick={() => navigate('/')}
        >
          <LogOut className="h-5 w-5" /> Log out
        </Button>
      </div>
      <BottomNav role="customer" />
    </div>
  );
}
