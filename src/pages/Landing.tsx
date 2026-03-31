import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-6">
          <span className="text-4xl">🔨</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">{t('app_name')}</h1>
        <p className="text-muted-foreground text-base">{t('landing.tagline')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full max-w-sm space-y-4"
      >
        <Button
          size="lg"
          className="w-full h-16 text-base font-bold gap-3 rounded-2xl shadow-lg"
          onClick={() => navigate('/login?role=customer')}
        >
          <User className="h-6 w-6" />
          {t('landing.need_work')}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full h-16 text-base font-bold gap-3 rounded-2xl border-2"
          onClick={() => navigate('/login?role=worker')}
        >
          <Briefcase className="h-6 w-6" />
          {t('landing.find_work')}
        </Button>
      </motion.div>

      <p className="text-xs text-muted-foreground mt-10">
        {t('landing.terms')}
      </p>
    </div>
  );
}
