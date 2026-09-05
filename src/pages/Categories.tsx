import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import SEO from '@/components/SEO';
import ServiceSearch from '@/components/ServiceSearch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_GROUPS, getGroup } from '@/lib/serviceCatalog';

export default function Categories() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [query, setQuery] = useState('');
  const activeGroup = getGroup(categoryId);

  const groups = useMemo(() => {
    if (activeGroup) return [activeGroup];
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_GROUPS;
    return CATEGORY_GROUPS.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.services.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [query, activeGroup]);

  const goToService = (groupId: string, service: string) =>
    navigate(`/customer/post-job?category=${groupId}&service=${encodeURIComponent(service)}`);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title={activeGroup ? `${activeGroup.name} Services Near You | NearWork` : 'All Service Categories | NearWork'}
        description={
          activeGroup
            ? `Hire verified ${activeGroup.name.toLowerCase()} professionals near you on NearWork. ${activeGroup.description}.`
            : 'Browse home, automotive, technology, education, beauty, moving, gardening, pet, event and professional services near you on NearWork.'
        }
      />
      <AppHeader title={activeGroup ? activeGroup.name : 'All Categories'} showBack />

      <div className="max-w-lg mx-auto px-4 py-4">
        {!activeGroup && <ServiceSearch value={query} onValueChange={setQuery} />}

        {groups.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No services matched “{query}”.</p>
        )}

        <div className="space-y-4">
          {groups.map((group, i) => (
            <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>{group.icon}</span>
                  <div className="min-w-0">
                    <h2 className="font-bold text-base">{group.name}</h2>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {group.services.map((svc) => (
                    <Badge
                      key={svc.slug}
                      variant="secondary"
                      className="cursor-pointer h-9 px-3 rounded-xl text-sm font-medium"
                      onClick={() => goToService(group.id, svc.name)}
                    >
                      {svc.name}
                    </Badge>
                  ))}
                </div>
                <Button
                  className="w-full mt-4 h-11 rounded-xl font-semibold gap-1"
                  onClick={() => navigate(`/customer/post-job?category=${group.id}`)}
                >
                  Post a {group.name.toLowerCase()} job <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <BottomNav role="customer" />
    </div>
  );
}
