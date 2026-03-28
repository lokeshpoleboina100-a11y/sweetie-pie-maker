import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import JobCard from '@/components/JobCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockJobs } from '@/lib/mock-data';
import { CATEGORY_ICONS, CATEGORY_LABELS, JobCategory } from '@/lib/types';

const categories: JobCategory[] = ['repair', 'plumbing', 'electrical', 'painting', 'construction', 'delivery', 'cleaning', 'freelance'];

export default function CustomerHome() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null);

  const filteredJobs = selectedCategory
    ? mockJobs.filter((j) => j.category === selectedCategory)
    : mockJobs;

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="NearWork" showNotifications />

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium">Anna Nagar, Chennai</span>
        </div>

        {/* Quick Post */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary rounded-2xl p-5 mb-6 text-primary-foreground"
        >
          <h2 className="font-bold text-lg mb-1">Need something done?</h2>
          <p className="text-sm opacity-90 mb-3">Post a job and get bids from nearby workers</p>
          <Button
            variant="secondary"
            className="font-bold gap-2 rounded-xl"
            onClick={() => navigate('/customer/post-job')}
          >
            <Plus className="h-4 w-4" /> Post a Job
          </Button>
        </motion.div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-hide">
          <Badge
            variant={selectedCategory === null ? 'default' : 'secondary'}
            className="cursor-pointer shrink-0 h-9 px-4 text-sm font-semibold rounded-xl"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'secondary'}
              className="cursor-pointer shrink-0 h-9 px-4 text-sm font-semibold rounded-xl gap-1.5"
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            >
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
            </Badge>
          ))}
        </div>

        {/* Jobs */}
        <h3 className="font-bold text-base mb-3">Your posted jobs</h3>
        <div className="space-y-3">
          {filteredJobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <JobCard job={job} viewAs="customer" />
            </motion.div>
          ))}
        </div>
      </div>

      <BottomNav role="customer" />
    </div>
  );
}
