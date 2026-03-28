import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, Shield, Star, Settings, HelpCircle, FileCheck } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockWorker } from '@/lib/mock-data';
import { CATEGORY_LABELS } from '@/lib/types';

const menuItems = [
  { icon: FileCheck, label: 'Verification Documents', path: '/worker' },
  { icon: Star, label: 'Reviews & Ratings', path: '/worker' },
  { icon: Settings, label: 'Settings', path: '/worker' },
  { icon: HelpCircle, label: 'Help & Support', path: '/worker' },
];

export default function WorkerProfile() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Profile" />
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">M</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">{mockWorker.name}</h2>
              {mockWorker.isVerified && (
                <Badge className="bg-accent text-accent-foreground gap-1 text-xs">
                  <Shield className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{mockWorker.phone}</p>
            <div className="flex items-center gap-1 text-sm mt-0.5">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="font-bold">{mockWorker.rating}</span>
              <span className="text-muted-foreground">({mockWorker.reviewCount} reviews)</span>
            </div>
          </div>
        </div>

        <Card className="p-4 mb-4">
          <h3 className="font-bold text-sm mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {mockWorker.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="rounded-lg">
                {CATEGORY_LABELS[skill]}
              </Badge>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-sm">
            <span className="text-muted-foreground">Experience</span>
            <span className="font-bold">{mockWorker.experience}</span>
          </div>
          <div className="flex justify-between mt-1 text-sm">
            <span className="text-muted-foreground">Service Radius</span>
            <span className="font-bold">{mockWorker.serviceRadius} km</span>
          </div>
        </Card>

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
      <BottomNav role="worker" />
    </div>
  );
}
