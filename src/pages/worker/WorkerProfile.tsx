import { Star, MapPin, Shield, LogOut, ChevronRight } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_LABELS } from '@/lib/types';

export default function WorkerProfile() {
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
              {(profile?.full_name || 'W').charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold">{profile?.full_name || 'Worker'}</h2>
              {profile?.is_verified && (
                <Badge className="bg-green-100 text-green-700 gap-1">
                  <Shield className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
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

        {profile?.skills && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary">{CATEGORY_LABELS[skill as keyof typeof CATEGORY_LABELS] || skill}</Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{profile?.total_jobs_completed || 0}</p>
            <p className="text-xs text-muted-foreground">Jobs Done</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{profile?.experience_years || 0}</p>
            <p className="text-xs text-muted-foreground">Years Exp</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{profile?.service_radius_km || 10}</p>
            <p className="text-xs text-muted-foreground">km Radius</p>
          </Card>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Edit Profile', action: () => {} },
            { label: 'Verification', action: () => {} },
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

      <BottomNav role="worker" />
    </div>
  );
}
