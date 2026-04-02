import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  User, Shield, CreditCard, Bell, Lock, Briefcase, Crown,
  ChevronRight, Save, MapPin, Phone, Mail, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Section = 'account' | 'security' | 'profile' | 'payments' | 'notifications' | 'privacy' | 'preferences' | 'subscription';

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'account', label: 'Account Settings', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'profile', label: 'Profile Details', icon: User },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy Controls', icon: Lock },
  { id: 'preferences', label: 'Job Preferences', icon: Briefcase },
  { id: 'subscription', label: 'Subscription', icon: Crown },
];

export default function WorkerSettings() {
  const { profile, user, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState<Section>('account');
  const [saving, setSaving] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [locationName, setLocationName] = useState(profile?.location_name || '');
  const [serviceRadius, setServiceRadius] = useState(profile?.service_radius_km || 10);
  const [experienceYears, setExperienceYears] = useState(profile?.experience_years || 0);

  // Toggles
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [chatNotifs, setChatNotifs] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);
  const [showEarnings, setShowEarnings] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  const [instantJobs, setInstantJobs] = useState(true);
  const [negotiableOnly, setNegotiableOnly] = useState(false);

  // Security
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [preferredCategory, setPreferredCategory] = useState<string>('repair');
  const [minBudget, setMinBudget] = useState('500');

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone,
        bio,
        location_name: locationName,
        service_radius_km: serviceRadius,
        experience_years: experienceYears,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Profile updated successfully.' });
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Password updated.' });
      setCurrentPassword('');
      setNewPassword('');
    }
    setSaving(false);
  };

  const renderSection = () => {
    switch (active) {
      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Account Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your account details and preferences.</p>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={user?.email || ''} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <LanguageSwitcher />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Security</h3>
              <p className="text-sm text-muted-foreground">Protect your account with a strong password.</p>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
                  <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
              </div>
              <Button onClick={handleChangePassword} disabled={saving} variant="destructive" className="gap-2">
                <Shield className="h-4 w-4" /> Update Password
              </Button>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Profile Details</h3>
              <p className="text-sm text-muted-foreground">Information visible to customers.</p>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bio / About</Label>
                <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell customers about your experience and skills..." rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Hyderabad, Telangana" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Experience (years)</Label>
                  <Input type="number" min={0} max={50} value={experienceYears} onChange={e => setExperienceYears(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Service Radius (km)</Label>
                  <Input type="number" min={1} max={100} value={serviceRadius} onChange={e => setServiceRadius(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {(profile?.skills || []).map(skill => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                  {(!profile?.skills || profile.skills.length === 0) && (
                    <p className="text-xs text-muted-foreground">No skills added yet.</p>
                  )}
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Payment Methods</h3>
              <p className="text-sm text-muted-foreground">Manage how you receive payments.</p>
            </div>
            <Separator />
            <div className="space-y-4">
              <Card className="p-4 border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">UPI</p>
                      <p className="text-xs text-muted-foreground">Primary payment method</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Bank Transfer</p>
                      <p className="text-xs text-muted-foreground">Direct deposit to bank</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Wallet</p>
                      <p className="text-xs text-muted-foreground">In-app wallet balance</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              </Card>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Notifications</h3>
              <p className="text-sm text-muted-foreground">Choose what alerts you receive.</p>
            </div>
            <Separator />
            <div className="space-y-5">
              {[
                { label: 'Email Notifications', desc: 'Receive updates via email', val: emailNotifs, set: setEmailNotifs },
                { label: 'Push Notifications', desc: 'Browser push alerts', val: pushNotifs, set: setPushNotifs },
                { label: 'SMS Notifications', desc: 'Text message alerts', val: smsNotifs, set: setSmsNotifs },
                { label: 'New Job Alerts', desc: 'Get notified about matching jobs', val: jobAlerts, set: setJobAlerts },
                { label: 'Chat Messages', desc: 'Alerts for new messages', val: chatNotifs, set: setChatNotifs },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={item.val} onCheckedChange={item.set} />
                </div>
              ))}
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Privacy Controls</h3>
              <p className="text-sm text-muted-foreground">Control who sees your information.</p>
            </div>
            <Separator />
            <div className="space-y-5">
              {[
                { label: 'Profile Visibility', desc: 'Make your profile visible to customers', val: profileVisible, set: setProfileVisible },
                { label: 'Show Earnings', desc: 'Display earnings on your profile', val: showEarnings, set: setShowEarnings },
                { label: 'Show Phone Number', desc: 'Let customers see your phone', val: showPhone, set: setShowPhone },
                { label: 'Show Location', desc: 'Show approximate location on map', val: showLocation, set: setShowLocation },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={item.val} onCheckedChange={item.set} />
                </div>
              ))}
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Job Preferences</h3>
              <p className="text-sm text-muted-foreground">Customize your job feed.</p>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred Category</Label>
                <Select value={preferredCategory} onValueChange={setPreferredCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['repair', 'plumbing', 'electrical', 'painting', 'construction', 'delivery', 'cleaning', 'freelance'].map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minimum Budget (₹)</Label>
                <Input type="number" value={minBudget} onChange={e => setMinBudget(e.target.value)} placeholder="500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Instant Jobs</p>
                  <p className="text-xs text-muted-foreground">Show instant/urgent job listings</p>
                </div>
                <Switch checked={instantJobs} onCheckedChange={setInstantJobs} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Negotiable Only</p>
                  <p className="text-xs text-muted-foreground">Show only negotiable budget jobs</p>
                </div>
                <Switch checked={negotiableOnly} onCheckedChange={setNegotiableOnly} />
              </div>
            </div>
          </div>
        );

      case 'subscription':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Subscription</h3>
              <p className="text-sm text-muted-foreground">Upgrade for premium features.</p>
            </div>
            <Separator />
            <div className="space-y-4">
              <Card className="p-5 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="h-6 w-6 text-primary" />
                  <div>
                    <h4 className="font-bold">Free Plan</h4>
                    <p className="text-xs text-muted-foreground">Your current plan</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm mb-4">
                  {['Browse all jobs', 'Place up to 5 bids/day', 'Basic chat', 'Standard listing'].map(f => (
                    <li key={f} className="flex items-center gap-2"><Checkbox checked disabled /><span>{f}</span></li>
                  ))}
                </ul>
                <Badge>Active</Badge>
              </Card>

              <Card className="p-5 border border-border opacity-80">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="h-6 w-6 text-warning" />
                  <div>
                    <h4 className="font-bold">Pro Plan — ₹299/mo</h4>
                    <p className="text-xs text-muted-foreground">Unlock premium features</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm mb-4">
                  {['Unlimited bids', 'Priority listing', 'Verified badge', 'Analytics dashboard', 'Dedicated support'].map(f => (
                    <li key={f} className="flex items-center gap-2"><Checkbox disabled /><span>{f}</span></li>
                  ))}
                </ul>
                <Button variant="outline" disabled>Coming Soon</Button>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Settings" showBack />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <nav className="md:w-56 flex-shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {sections.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                      active === s.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden md:inline">{s.label}</span>
                    <span className="md:hidden">{s.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <Card className="flex-1 p-6">
            {renderSection()}
          </Card>
        </div>
      </div>

      <BottomNav role="worker" />
    </div>
  );
}
