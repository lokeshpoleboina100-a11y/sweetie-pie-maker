import { TrendingUp, Briefcase, Star, IndianRupee } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { mockWorker } from '@/lib/mock-data';

const stats = [
  { icon: IndianRupee, label: 'Total Earnings', value: `₹${mockWorker.earnings.toLocaleString('en-IN')}`, color: 'text-primary' },
  { icon: Briefcase, label: 'Jobs Completed', value: mockWorker.completedJobs, color: 'text-accent' },
  { icon: Star, label: 'Rating', value: mockWorker.rating, color: 'text-warning' },
  { icon: TrendingUp, label: 'This Month', value: '₹24,500', color: 'text-primary' },
];

const recentPayments = [
  { job: 'Kitchen tap repair', amount: 450, date: 'Today' },
  { job: 'AC gas refill', amount: 1200, date: 'Yesterday' },
  { job: 'Bathroom plumbing', amount: 800, date: '26 Mar' },
  { job: 'Water tank repair', amount: 650, date: '25 Mar' },
];

export default function WorkerEarnings() {
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
        <div className="space-y-2">
          {recentPayments.map((p, i) => (
            <Card key={i} className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-sm">{p.job}</p>
                <p className="text-xs text-muted-foreground">{p.date}</p>
              </div>
              <span className="font-extrabold text-accent">+₹{p.amount}</span>
            </Card>
          ))}
        </div>
      </div>
      <BottomNav role="worker" />
    </div>
  );
}
