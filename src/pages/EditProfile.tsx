import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { locationData } from '@/lib/location-data';
import AvatarUpload from '@/components/AvatarUpload';
import AppHeader from '@/components/AppHeader';

export default function EditProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('IN');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      // Parse location_name to extract state/district if stored
      const loc = profile.location_name || '';
      const parts = loc.split(', ');
      if (parts.length >= 2) {
        setDistrict(parts[0]);
        // Try to find matching state
        const stateEntry = Object.entries(locationData.districts).find(([, districts]) =>
          districts.some(d => d.value === parts[0])
        );
        if (stateEntry) setState(stateEntry[0]);
      }
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const locationName = district && state
      ? `${district}, ${locationData.states.IN.find(s => s.value === state)?.label || state}`
      : '';

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone,
        bio,
        location_name: locationName,
      })
      .eq('user_id', user.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await refreshProfile();
      toast({ title: t('edit_profile.saved', 'Profile saved!') });
      navigate(-1);
    }
  };

  const availableStates = locationData.states[country] || [];
  const availableDistricts = locationData.districts[state] || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={t('edit_profile.title', 'Edit Profile')} showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex justify-center">
          <AvatarUpload />
        </div>

        <div className="space-y-1.5">
          <Label>{t('edit_profile.name', 'Full Name')}</Label>
          <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-12 rounded-xl" />
        </div>

        <div className="space-y-1.5">
          <Label>{t('edit_profile.phone', 'Phone Number')}</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="h-12 rounded-xl" />
        </div>

        <div className="space-y-1.5">
          <Label>{t('edit_profile.bio', 'Bio')}</Label>
          <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="rounded-xl" placeholder={t('edit_profile.bio_placeholder', 'Tell us about yourself...')} />
        </div>

        {/* Location: Country → State → District */}
        <div className="space-y-1.5">
          <Label>{t('edit_profile.country', 'Country')}</Label>
          <Select value={country} onValueChange={v => { setCountry(v); setState(''); setDistrict(''); }}>
            <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {locationData.countries.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{t('edit_profile.state', 'State')}</Label>
          <Select value={state} onValueChange={v => { setState(v); setDistrict(''); }}>
            <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder={t('edit_profile.select_state', 'Select state')} /></SelectTrigger>
            <SelectContent>
              {availableStates.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {state && (
          <div className="space-y-1.5">
            <Label>{t('edit_profile.district', 'District')}</Label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder={t('edit_profile.select_district', 'Select district')} /></SelectTrigger>
              <SelectContent>
                {availableDistricts.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl font-bold gap-2">
          <Save className="h-5 w-5" />
          {saving ? t('edit_profile.saving', 'Saving...') : t('edit_profile.save', 'Save Profile')}
        </Button>
      </div>
    </div>
  );
}
