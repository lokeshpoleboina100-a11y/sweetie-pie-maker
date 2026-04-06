import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '@/components/AnimatedBackground';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Animated canvas background */}
      <AnimatedBackground />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/30 z-[1]" />

      {/* Content */}
      <div className="relative z-[2] flex flex-col items-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mb-6 shadow-lg shadow-primary/30"
          >
            <Sparkles className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-white drop-shadow-lg">
            {t('landing.hero_title', 'Find the Perfect Freelancer')}
          </h1>
          <p className="text-white/80 text-base md:text-lg max-w-md mx-auto">
            {t('landing.hero_subtitle', 'Hire experts or find jobs easily on the most trusted marketplace')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-sm space-y-4"
        >
          <Button
            size="lg"
            className="w-full h-16 text-base font-bold gap-3 rounded-2xl shadow-lg bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 border-0"
            onClick={() => navigate('/login?role=customer')}
          >
            <User className="h-6 w-6" />
            {t('landing.need_work', 'Hire Freelancer')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-16 text-base font-bold gap-3 rounded-2xl border-2 border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20"
            onClick={() => navigate('/login?role=worker')}
          >
            <Briefcase className="h-6 w-6" />
            {t('landing.find_work', 'Find Work')}
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-white/50 mt-10"
        >
          {t('landing.terms')}
        </motion.p>
      </div>
    </div>
  );
}
