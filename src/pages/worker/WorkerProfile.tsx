import { Star, MapPin, Shield, LogOut, ChevronRight } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import AvatarUpload from '@/components/AvatarUpload';

export default function WorkerProfile() {
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
          <AvatarUpload />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold">{profile?.full_name || 'Worker'}</h2>
              {profile?.is_verified && (
                <Badge className="bg-green-100 text-green-700 gap-1">
                  <Shield className="h-3 w-3" /> {t('profile.verified')}
                </Badge>
              )}
            </div>
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

        {profile?.skills && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary">{t(`categories.${skill}`, { defaultValue: skill })}</Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{profile?.total_jobs_completed || 0}</p>
            <p className="text-xs text-muted-foreground">{t('profile.jobs_done')}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{profile?.experience_years || 0}</p>
            <p className="text-xs text-muted-foreground">{t('profile.years_exp')}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{profile?.service_radius_km || 10}</p>
            <p className="text-xs text-muted-foreground">{t('profile.km_radius')}</p>
          </Card>
        </div>

        <Card className="p-4 mb-4">
          <LanguageSwitcher />
        </Card>

        <div className="space-y-2">
          {[
            { label: t('profile.edit_profile'), action: () => navigate('/edit-profile') },
            { label: t('profile.verification'), action: () => navigate('/worker/verification') },
            { label: t('profile.settings'), action: () => navigate('/worker/settings') },
            { label: t('ai_help.title', 'AI Help Desk'), action: () => navigate('/ai-help') },
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

      <BottomNav role="worker" />
    </div>
  );
}
