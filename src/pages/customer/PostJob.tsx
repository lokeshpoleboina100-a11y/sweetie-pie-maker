import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CATEGORY_LABELS, CATEGORY_ICONS, JobCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbJobCategory = Database['public']['Enums']['job_category'];
const categories: DbJobCategory[] = ['repair', 'plumbing', 'electrical', 'painting', 'construction', 'delivery', 'cleaning', 'freelance'];

export default function PostJob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isInstant, setIsInstant] = useState(false);
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [category, setCategory] = useState<DbJobCategory | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        budget_min: budgetVal,
        budget_max: budgetVal,
        is_negotiable: isNegotiable,
        is_instant: isInstant,
        location_name: locationName || 'Anna Nagar, Chennai',
        latitude: 13.0827,
        longitude: 80.2707,
      });

      if (error) throw error;
      toast({ title: 'Job posted!', description: 'Workers nearby will be notified.' });
      navigate('/customer');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader title="Post a Job" showBack />

      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-lg mx-auto px-4 py-4 space-y-5"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label className="font-bold">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DbJobCategory)}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Job Title</Label>
          <Input placeholder="e.g. Fix leaking tap" className="h-12 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Description</Label>
          <Textarea placeholder="Describe the work in detail..." className="min-h-[100px] rounded-xl" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Budget (₹)</Label>
          <Input type="number" placeholder="500" className="h-12 rounded-xl" value={budget} onChange={(e) => setBudget(e.target.value)} required />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch id="negotiable" checked={isNegotiable} onCheckedChange={setIsNegotiable} />
            <label htmlFor="negotiable">Budget is negotiable</label>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Location</Label>
          <Input placeholder="e.g. Anna Nagar, Chennai" className="h-12 rounded-xl" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Photos (optional)</Label>
          <Button type="button" variant="outline" className="w-full h-24 rounded-xl border-dashed gap-2 flex-col">
            <Camera className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Add photos</span>
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/10 border border-accent/20">
          <div>
            <p className="font-bold text-sm">⚡ Instant Job</p>
            <p className="text-xs text-muted-foreground">First available worker gets it</p>
          </div>
          <Switch checked={isInstant} onCheckedChange={setIsInstant} />
        </div>

        <Button type="submit" size="lg" className="w-full h-14 text-base font-bold rounded-2xl" disabled={isSubmitting || !category}>
          {isSubmitting ? 'Posting...' : 'Post Job'}
        </Button>
      </motion.form>
    </div>
  );
}
