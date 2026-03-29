import { TrendingUp, Briefcase, Star, IndianRupee } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function WorkerEarnings() {
  const { profile } = useAuth();

  const stats = [
    { icon: IndianRupee, label: 'Total Earnings', value: '₹0', color: 'text-primary' },
    { icon: Briefcase, label: 'Jobs Completed', value: profile?.total_jobs_completed || 0, color: 'text-accent' },
    { icon: Star, label: 'Rating', value: profile?.rating || 0, color: 'text-warning' },
    { icon: TrendingUp, label: 'This Month', value: '₹0', color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Earnings" />
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((s) => (
            <Card key={s.label} className="p-4">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <p className="text-2xl font-extrabold">{s.value}</p>
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </Card>
          ))}
        </div>

        <h3 className="font-bold text-base mb-3">Recent Payments</h3>
        <p className="text-center text-muted-foreground py-8 text-sm">No payments yet</p>
      </div>
      <BottomNav role="worker" />
    </div>
  );
}
