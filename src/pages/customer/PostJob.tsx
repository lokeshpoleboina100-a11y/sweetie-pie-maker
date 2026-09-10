import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import LocationPicker from '@/components/LocationPicker';
import AppHeader from '@/components/AppHeader';
import AIProblemDetection from '@/components/AIProblemDetection';
import AIJobAssistant, { type AiExplanation } from '@/components/AIJobAssistant';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { CATEGORY_GROUPS, getGroup, type DbJobCategory } from '@/lib/serviceCatalog';

export default function PostJob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [isInstant, setIsInstant] = useState(false);
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [category, setCategory] = useState<DbJobCategory | ''>('');
  const [service, setService] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobLat, setJobLat] = useState<number>(13.0827);
  const [jobLng, setJobLng] = useState<number>(80.2707);
  const [aiExplanation, setAiExplanation] = useState<AiExplanation | null>(null);

  // Pre-fill from the category / service the customer picked before landing here.
  useEffect(() => {
    const group = getGroup(params.get('category'));
    if (group) {
      setCategory(group.id);
      const svc = params.get('service');
      if (svc && group.services.some((s) => s.name === svc)) setService(svc);
    }
  }, [params]);

  const activeGroup = getGroup(category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !category) return;

    setIsSubmitting(true);
    try {
      const budgetVal = parseInt(budget) || 0;
      const { error } = await supabase.from('jobs').insert({
        customer_id: user.id,
        title,
        description,
        category: category as DbJobCategory,
        service: service || null,
        budget_min: budgetVal,
        budget_max: budgetVal,
        is_negotiable: isNegotiable,
        is_instant: isInstant,
        location_name: locationName || 'Not set',
        latitude: jobLat,
        longitude: jobLng,
        ai_explanation: (aiExplanation as any) ?? null,
      });

      if (error) throw error;
      toast({ title: t('post_job.success'), description: t('post_job.success_desc') });
      navigate('/customer');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader title={t('post_job.title')} showBack />

      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-lg mx-auto px-4 py-4 space-y-5"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label className="font-bold">{t('post_job.category')}</Label>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as DbJobCategory);
              setService('');
            }}
          >
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder={t('post_job.select_category')} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_GROUPS.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.icon} {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeGroup && (
          <div className="space-y-2">
            <Label className="font-bold">Service needed</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder={`Choose a ${activeGroup.name.toLowerCase()} service`} />
              </SelectTrigger>
              <SelectContent>
                {activeGroup.services.map((svc) => (
                  <SelectItem key={svc.slug} value={svc.name}>
                    {svc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label className="font-bold">{t('post_job.job_title')}</Label>
          <Input placeholder={t('post_job.job_title_placeholder')} className="h-12 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label className="font-bold">{t('post_job.description')}</Label>
          <Textarea placeholder={t('post_job.description_placeholder')} className="min-h-[100px] rounded-xl" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>

        <AIJobAssistant
          title={title}
          description={description}
          onApplyCategory={(c) => {
            const group = getGroup(c);
            if (group) {
              setCategory(group.id);
              setService('');
            }
          }}
          onApplyBudget={(amount) => setBudget(String(amount))}
          onExplanationChange={setAiExplanation}
        />

        <div className="space-y-2">
          <Label className="font-bold">{t('post_job.budget')}</Label>
          <Input type="number" placeholder="500" className="h-12 rounded-xl" value={budget} onChange={(e) => setBudget(e.target.value)} required />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch id="negotiable" checked={isNegotiable} onCheckedChange={setIsNegotiable} />
            <label htmlFor="negotiable">{t('post_job.negotiable')}</label>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">{t('post_job.location')}</Label>
          <LocationPicker
            latitude={jobLat}
            longitude={jobLng}
            locationName={locationName}
            onLocationChange={(lat, lng, name) => {
              setJobLat(lat);
              setJobLng(lng);
              setLocationName(name);
            }}
          />
        </div>

        <AIProblemDetection
          hint={[title, description].filter(Boolean).join(' — ')}
          onUseResult={(line) =>
            setDescription((prev) => (prev.includes(line) ? prev : [prev.trim(), line].filter(Boolean).join('\n\n')))
          }
        />


        <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/10 border border-accent/20">
          <div>
            <p className="font-bold text-sm">{t('post_job.instant_job')}</p>
            <p className="text-xs text-muted-foreground">{t('post_job.instant_desc')}</p>
          </div>
          <Switch checked={isInstant} onCheckedChange={setIsInstant} />
        </div>

        <Button type="submit" size="lg" className="w-full h-14 text-base font-bold rounded-2xl" disabled={isSubmitting || !category}>
          {isSubmitting ? t('post_job.submitting') : t('post_job.submit')}
        </Button>
      </motion.form>
    </div>
  );
}
