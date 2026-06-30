import { useState, useEffect } from 'react';
import { MapPin, SlidersHorizontal, Loader2, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import JobCard from '@/components/JobCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_ICONS, JobCategory } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@/integrations/supabase/types';

type DbJob = Tables<'jobs'>;
const categories: JobCategory[] = ['repair', 'plumbing', 'electrical', 'painting', 'construction', 'delivery', 'cleaning', 'freelance'];

export default function WorkerHome() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null);
  const [jobs, setJobs] = useState<DbJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      setJobs(data || []);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const filteredJobs = selectedCategory ? jobs.filter((j) => j.category === selectedCategory) : jobs;

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader
        title={t('worker_home.nearby_jobs')}
        showNotifications
        right={
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        }
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium">Anna Nagar, Chennai</span>
          <span className="text-xs">• {t('worker_home.radius', { km: 10 })}</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-hide">
          <Badge
            variant={selectedCategory === null ? 'default' : 'secondary'}
            className="cursor-pointer shrink-0 h-9 px-4 text-sm font-semibold rounded-xl"
            onClick={() => setSelectedCategory(null)}
          >
            {t('worker_home.all')}
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'secondary'}
              className="cursor-pointer shrink-0 h-9 px-4 text-sm font-semibold rounded-xl gap-1.5"
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            >
              {CATEGORY_ICONS[cat]} {t(`categories.${cat}`)}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mb-3">{t('worker_home.jobs_found', { count: filteredJobs.length })}</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-semibold mb-1">{t('worker_home.no_jobs')}</p>
            <p className="text-sm">{t('worker_home.no_jobs_desc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <JobCard job={job} viewAs="worker" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav role="worker" />
    </div>
  );
}
