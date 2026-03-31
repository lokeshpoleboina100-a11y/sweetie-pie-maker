import { Star, MapPin, LogOut, ChevronRight } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function CustomerProfile() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title={t('profile.title')} />

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
              <span>({t('profile.reviews', { count: profile?.total_reviews || 0 })})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{profile?.location_name || t('profile.location_not_set')}</span>
            </div>
          </div>
        </div>

        <Card className="p-4 mb-4">
          <LanguageSwitcher />
        </Card>

        <div className="space-y-2">
          {[
            { label: t('profile.edit_profile'), action: () => {} },
            { label: t('profile.my_jobs'), action: () => navigate('/customer') },
            { label: t('profile.payment_history'), action: () => {} },
            { label: t('profile.settings'), action: () => {} },
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
          <LogOut className="h-5 w-5" /> {t('profile.sign_out')}
        </Button>
      </div>

      <BottomNav role="customer" />
    </div>
  );
}
