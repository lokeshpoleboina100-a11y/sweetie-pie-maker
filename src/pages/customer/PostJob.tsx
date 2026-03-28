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

const categories: JobCategory[] = ['repair', 'plumbing', 'electrical', 'painting', 'construction', 'delivery', 'cleaning', 'freelance', 'other'];

export default function PostJob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isInstant, setIsInstant] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Job posted!', description: 'Workers nearby will be notified.' });
    navigate('/customer');
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
          <Select>
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
          <Input placeholder="e.g. Fix leaking tap" className="h-12 rounded-xl" />
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Description</Label>
          <Textarea placeholder="Describe the work in detail..." className="min-h-[100px] rounded-xl" />
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Budget (₹)</Label>
          <Input type="number" placeholder="500" className="h-12 rounded-xl" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch id="negotiable" />
            <label htmlFor="negotiable">Budget is negotiable</label>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Location</Label>
          <Button type="button" variant="outline" className="w-full h-12 rounded-xl gap-2 justify-start text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Use current location
          </Button>
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

        <Button type="submit" size="lg" className="w-full h-14 text-base font-bold rounded-2xl">
          Post Job
        </Button>
      </motion.form>
    </div>
  );
}
