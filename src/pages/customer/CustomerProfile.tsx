import { Star, MapPin, LogOut, ChevronRight } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function CustomerProfile() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Profile" />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {(profile?.full_name || 'U').charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-extrabold">{profile?.full_name || 'User'}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-semibold">{profile?.rating || 0}</span>
              <span>({profile?.total_reviews || 0} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{profile?.location_name || 'Location not set'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Edit Profile', action: () => {} },
            { label: 'My Jobs', action: () => navigate('/customer') },
            { label: 'Payment History', action: () => {} },
            { label: 'Settings', action: () => {} },
          ].map((item) => (
            <Card key={item.label} className="p-4 cursor-pointer" onClick={item.action}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{item.label}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-6 h-12 rounded-xl gap-2 text-destructive border-destructive/20" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" /> Sign Out
        </Button>
      </div>

      <BottomNav role="customer" />
    </div>
  );
}
