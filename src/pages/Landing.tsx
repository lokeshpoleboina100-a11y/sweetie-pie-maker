import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, User, Star, Search, Shield, CreditCard, MessageSquare, ArrowRight, Code, Palette, PenTool, Megaphone, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';

const TYPING_ROLES = ['Developers', 'Designers', 'Writers', 'Marketers', 'App Builders'];

function useTypingEffect(words: string[], speed = 100, pause = 1800) {
  const [display, setDisplay] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(word.slice(0, charIdx + 1));
        if (charIdx + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause);
        } else {
          setCharIdx(c => c + 1);
        }
      } else {
        setDisplay(word.slice(0, charIdx));
        if (charIdx === 0) {
          setDeleting(false);
          setWordIdx(i => (i + 1) % words.length);
        } else {
          setCharIdx(c => c - 1);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return display;
}

const CATEGORIES = [
  { icon: Code, label: 'Web Development', count: '2.4k+ freelancers' },
  { icon: Smartphone, label: 'App Development', count: '1.8k+ freelancers' },
  { icon: Palette, label: 'Graphic Design', count: '3.1k+ freelancers' },
  { icon: PenTool, label: 'Content Writing', count: '2.7k+ freelancers' },
  { icon: Megaphone, label: 'Digital Marketing', count: '1.5k+ freelancers' },
];

const FEATURED_FREELANCERS = [
  { name: 'Priya Sharma', role: 'Full-Stack Developer', rating: 4.9, reviews: 128, price: '₹800/hr', avatar: '👩‍💻', skills: ['React', 'Node.js', 'AWS'] },
  { name: 'Arjun Patel', role: 'UI/UX Designer', rating: 4.8, reviews: 95, price: '₹650/hr', avatar: '👨‍🎨', skills: ['Figma', 'Adobe XD', 'Branding'] },
  { name: 'Meera Reddy', role: 'Content Strategist', rating: 4.9, reviews: 203, price: '₹500/hr', avatar: '✍️', skills: ['SEO', 'Copywriting', 'Blogs'] },
  { name: 'Karthik Nair', role: 'Mobile Developer', rating: 4.7, reviews: 76, price: '₹900/hr', avatar: '📱', skills: ['Flutter', 'React Native', 'iOS'] },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Post a Job', desc: 'Describe your project, set a budget, and post it in minutes.', icon: Briefcase },
  { step: '02', title: 'Get Proposals', desc: 'Skilled freelancers bid on your project with competitive offers.', icon: Search },
  { step: '03', title: 'Hire & Pay Securely', desc: 'Choose the best match, collaborate, and pay through our secure system.', icon: Shield },
];

const TESTIMONIALS = [
  { name: 'Rahul M.', role: 'Startup Founder', text: 'Found an amazing developer within hours. The quality of talent here is unmatched!', rating: 5 },
  { name: 'Sneha K.', role: 'Marketing Manager', text: 'The platform made it so easy to find and hire a designer for our rebrand. Highly recommend!', rating: 5 },
  { name: 'Vikram S.', role: 'Freelance Developer', text: 'Great platform for finding quality projects. The payment system is smooth and reliable.', rating: 5 },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const typedRole = useTypingEffect(TYPING_ROLES);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="absolute inset-0 bg-black/20 z-[1]" />

      {/* ─── HERO ─── */}
      <section className="relative z-[2] min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <Badge className="mb-6 bg-white/10 text-white/90 border-white/20 backdrop-blur-sm text-sm px-4 py-1.5">
            🚀 Trusted by 10,000+ businesses
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-4 max-w-4xl mx-auto">
            Find the Perfect<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Freelancer</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-2 max-w-2xl mx-auto">
            Hire experts or get hired easily — connect with top
          </p>
          <p className="text-2xl md:text-3xl font-bold text-cyan-400 mb-8 h-10">
            {typedRole}<span className="animate-pulse">|</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="h-14 px-8 text-base font-bold gap-3 rounded-2xl shadow-xl shadow-primary/30 bg-primary hover:bg-primary/90"
              onClick={() => navigate('/login?role=customer')}
            >
              <User className="h-5 w-5" /> Hire a Freelancer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-bold gap-3 rounded-2xl border-2 border-white/25 text-white bg-white/5 backdrop-blur-sm hover:bg-white/15"
              onClick={() => navigate('/login?role=worker')}
            >
              <Briefcase className="h-5 w-5" /> Find Work <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-16 grid grid-cols-3 gap-6 md:gap-12 text-center"
        >
          {[
            { value: '50K+', label: 'Freelancers' },
            { value: '25K+', label: 'Projects Done' },
            { value: '4.8★', label: 'Avg Rating' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl md:text-3xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs md:text-sm text-white/50">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="relative z-[2] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mb-3">Browse by Category</motion.h2>
            <motion.p variants={fadeUp} className="text-white/60 max-w-lg mx-auto">Explore top talent across the most in-demand fields</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.map(cat => (
              <motion.div key={cat.label} variants={fadeUp}>
                <Card className="p-5 text-center bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-pointer group">
                  <cat.icon className="h-8 w-8 mx-auto mb-3 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-white text-sm mb-1">{cat.label}</p>
                  <p className="text-xs text-white/50">{cat.count}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURED FREELANCERS ─── */}
      <section className="relative z-[2] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mb-3">Featured Freelancers</motion.h2>
            <motion.p variants={fadeUp} className="text-white/60 max-w-lg mx-auto">Top-rated professionals ready to work on your project</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURED_FREELANCERS.map(f => (
              <motion.div key={f.name} variants={fadeUp}>
                <Card className="p-5 bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all hover:-translate-y-1">
                  <div className="text-4xl mb-3">{f.avatar}</div>
                  <h3 className="font-bold text-white text-lg">{f.name}</h3>
                  <p className="text-sm text-cyan-400 mb-2">{f.role}</p>
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold text-white">{f.rating}</span>
                    <span className="text-xs text-white/50">({f.reviews} reviews)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {f.skills.map(s => (
                      <Badge key={s} variant="secondary" className="bg-white/10 text-white/80 border-0 text-xs">{s}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{f.price}</span>
                    <Button size="sm" className="rounded-xl text-xs h-8">Hire</Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative z-[2] py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mb-3">How It Works</motion.h2>
            <motion.p variants={fadeUp} className="text-white/60">Get started in three simple steps</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(item => (
              <motion.div key={item.step} variants={fadeUp} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="block text-xs font-bold text-primary mb-1">STEP {item.step}</span>
                <h3 className="font-bold text-xl text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="relative z-[2] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mb-3">What Our Users Say</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <motion.div key={t.name} variants={fadeUp}>
                <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-sm">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-white/80 text-sm mb-4 leading-relaxed">"{t.text}"</p>
                  <div>
                    <p className="font-bold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-white/50">{t.role}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative z-[2] py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/30 to-cyan-600/20 border border-white/10 rounded-3xl p-10 md:p-16 backdrop-blur-md"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">Join thousands of clients and freelancers already building amazing things together.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 px-8 font-bold rounded-2xl shadow-lg" onClick={() => navigate('/login?role=customer')}>
              <User className="h-5 w-5 mr-2" /> Start Hiring
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 font-bold rounded-2xl border-white/25 text-white bg-white/5 hover:bg-white/15" onClick={() => navigate('/login?role=worker')}>
              <Briefcase className="h-5 w-5 mr-2" /> Start Earning
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-[2] border-t border-white/10 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <h4 className="font-bold text-white mb-3">Platform</h4>
            <ul className="space-y-2 text-white/50">
              <li className="hover:text-white/80 cursor-pointer">How It Works</li>
              <li className="hover:text-white/80 cursor-pointer">Pricing</li>
              <li className="hover:text-white/80 cursor-pointer">Enterprise</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Categories</h4>
            <ul className="space-y-2 text-white/50">
              <li className="hover:text-white/80 cursor-pointer">Web Development</li>
              <li className="hover:text-white/80 cursor-pointer">Design</li>
              <li className="hover:text-white/80 cursor-pointer">Marketing</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Support</h4>
            <ul className="space-y-2 text-white/50">
              <li className="hover:text-white/80 cursor-pointer">Help Center</li>
              <li className="hover:text-white/80 cursor-pointer">Contact Us</li>
              <li className="hover:text-white/80 cursor-pointer">AI Help Desk</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-white/50">
              <li className="hover:text-white/80 cursor-pointer">Terms of Service</li>
              <li className="hover:text-white/80 cursor-pointer">Privacy Policy</li>
              <li className="hover:text-white/80 cursor-pointer">Cookie Policy</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40">© 2026 FixIt. All rights reserved.</p>
          <div className="flex gap-4">
            <MessageSquare className="h-5 w-5 text-white/40 hover:text-white/70 cursor-pointer" />
            <CreditCard className="h-5 w-5 text-white/40 hover:text-white/70 cursor-pointer" />
            <Shield className="h-5 w-5 text-white/40 hover:text-white/70 cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
}
