import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Users, Briefcase, IndianRupee, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalUsers: number;
  customerCount: number;
  workerCount: number;
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  totalRevenue: number;
  totalPayments: number;
  totalReviews: number;
  monthlyJobs: Record<string, number>;
  monthlyRevenue: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'hsl(25, 95%, 53%)',
  in_progress: 'hsl(210, 92%, 45%)',
  completed: 'hsl(160, 84%, 39%)',
  cancelled: 'hsl(0, 84%, 60%)',
};

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch('get_stats')
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive font-semibold">{error}</p>
        <p className="text-sm text-muted-foreground mt-2">Make sure you have admin privileges.</p>
      </Card>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, sub: `${stats.customerCount} customers · ${stats.workerCount} workers` },
    { label: 'Total Jobs', value: stats.totalJobs, icon: Briefcase, sub: `${stats.jobsByStatus.open || 0} open · ${stats.jobsByStatus.completed || 0} completed` },
    { label: 'Revenue (Commission)', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, sub: `${stats.totalPayments} payments` },
    { label: 'Reviews', value: stats.totalReviews, icon: Star, sub: 'Total reviews submitted' },
  ];

  const jobStatusData = Object.entries(stats.jobsByStatus).map(([name, value]) => ({ name, value }));

  const monthlyData = Object.keys(stats.monthlyJobs)
    .sort()
    .slice(-6)
    .map((month) => ({
      month: month.substring(5),
      jobs: stats.monthlyJobs[month] || 0,
      revenue: stats.monthlyRevenue[month] || 0,
    }));

  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-2xl font-extrabold">Dashboard Overview</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{card.label}</span>
              <card.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-extrabold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly jobs chart */}
        <Card className="p-5">
          <h3 className="font-bold mb-4">Monthly Jobs</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="jobs" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>
          )}
        </Card>

        {/* Job status pie */}
        <Card className="p-5">
          <h3 className="font-bold mb-4">Jobs by Status</h3>
          {jobStatusData.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={jobStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {jobStatusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#999'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}
