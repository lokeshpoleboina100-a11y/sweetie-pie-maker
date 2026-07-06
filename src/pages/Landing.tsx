import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Briefcase, User, Star, Search, Shield, CreditCard, MessageSquare, ArrowRight,
  Code, Palette, PenTool, Megaphone, Smartphone, Sparkles, Zap, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, useState } from 'react';
import PremiumBackground from '@/components/PremiumBackground';
import { SEO } from '@/components/SEO';

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
        if (charIdx + 1 === word.length) setTimeout(() => setDeleting(true), pause);
        else setCharIdx(c => c + 1);
      } else {
        setDisplay(word.slice(0, charIdx));
        if (charIdx === 0) { setDeleting(false); setWordIdx(i => (i + 1) % words.length); }
        else setCharIdx(c => c - 1);
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return display;
}

function useCounter(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

const CATEGORIES = [
  { icon: Code,       label: 'Web Development',   count: '2.4k+ freelancers', hue: 'from-[#6C63FF] to-[#00D4FF]' },
  { icon: Smartphone, label: 'App Development',   count: '1.8k+ freelancers', hue: 'from-[#00D4FF] to-[#8B5CF6]' },
  { icon: Palette,    label: 'Graphic Design',    count: '3.1k+ freelancers', hue: 'from-[#FF4D9D] to-[#6C63FF]' },
  { icon: PenTool,    label: 'Content Writing',   count: '2.7k+ freelancers', hue: 'from-[#8B5CF6] to-[#FF4D9D]' },
  { icon: Megaphone,  label: 'Digital Marketing', count: '1.5k+ freelancers', hue: 'from-[#00D4FF] to-[#FF4D9D]' },
];

const FEATURED = [
  { name: 'Priya Sharma', role: 'Full-Stack Developer', rating: 4.9, reviews: 128, price: '₹800/hr', avatar: '👩‍💻', skills: ['React','Node.js','AWS'] },
  { name: 'Arjun Patel',  role: 'UI/UX Designer',       rating: 4.8, reviews: 95,  price: '₹650/hr', avatar: '👨‍🎨', skills: ['Figma','Adobe XD','Branding'] },
  { name: 'Meera Reddy',  role: 'Content Strategist',   rating: 4.9, reviews: 203, price: '₹500/hr', avatar: '✍️',   skills: ['SEO','Copywriting','Blogs'] },
  { name: 'Karthik Nair', role: 'Mobile Developer',     rating: 4.7, reviews: 76,  price: '₹900/hr', avatar: '📱',   skills: ['Flutter','React Native','iOS'] },
];

const HOW = [
  { step: '01', title: 'Post a Job',        desc: 'Describe your project, set a budget, and go live in minutes.', icon: Briefcase },
  { step: '02', title: 'Get Proposals',     desc: 'Skilled freelancers bid with competitive offers and portfolios.', icon: Search },
  { step: '03', title: 'Hire & Pay Safely', desc: 'Collaborate in chat and pay through secure milestone escrow.', icon: Shield },
];

const TESTIMONIALS = [
  { name: 'Rahul M.',  role: 'Startup Founder',    text: 'Found an amazing developer within hours. The quality of talent here is unmatched.', rating: 5 },
  { name: 'Sneha K.',  role: 'Marketing Manager',  text: 'The platform made it painless to hire a designer for our rebrand. Highly recommend.', rating: 5 },
  { name: 'Vikram S.', role: 'Freelance Developer',text: 'Great source of quality projects and the payment system is smooth and reliable.',   rating: 5 },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp  = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } } };

/* ─── HERO — 3D geometric floating shapes with mouse parallax ─── */
function FloatingShapes({ mx, my }: { mx: any; my: any }) {
  const items = [
    { style: 'top-[8%] left-[6%] w-24 h-24 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF]', rotate: 12, depth: 30 },
    { style: 'top-[14%] right-[8%] w-32 h-32 rounded-full bg-gradient-to-br from-[#FF4D9D] to-[#8B5CF6]', rotate: -8, depth: 45 },
    { style: 'bottom-[18%] left-[10%] w-20 h-20 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#6C63FF]', rotate: 24, depth: 20 },
    { style: 'bottom-[10%] right-[14%] w-28 h-28 rounded-3xl bg-gradient-to-br from-[#8B5CF6] to-[#FF4D9D]', rotate: -18, depth: 55 },
    { style: 'top-[45%] left-[3%] w-16 h-16 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#FF4D9D]', rotate: 0, depth: 15 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {items.map((it, i) => {
        const x = useTransform(mx, (v: number) => (v - 0.5) * it.depth);
        const y = useTransform(my, (v: number) => (v - 0.5) * it.depth);
        return (
          <motion.div
            key={i}
            style={{ x, y, rotate: it.rotate }}
            className={`absolute ${it.style} opacity-40 blur-[0.5px] shadow-2xl animate-float`}
          />
        );
      })}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const typedRole = useTypingEffect(TYPING_ROLES);

  // mouse parallax
  const mxRaw = useMotionValue(0.5);
  const myRaw = useMotionValue(0.5);
  const mx = useSpring(mxRaw, { stiffness: 60, damping: 15 });
  const my = useSpring(myRaw, { stiffness: 60, damping: 15 });
  useEffect(() => {
    const h = (e: MouseEvent) => {
      mxRaw.set(e.clientX / window.innerWidth);
      myRaw.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, [mxRaw, myRaw]);

  // stat counters
  const statsRef = useRef<HTMLDivElement>(null);
  const [countStart, setCountStart] = useState(false);
  useEffect(() => {
    if (!statsRef.current) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setCountStart(true), { threshold: 0.4 });
    io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);
  const freelancers = useCounter(50, 1600, countStart);
  const projects    = useCounter(25, 1600, countStart);
  const rating      = useCounter(48, 1600, countStart);

  return (
    <div className="min-h-screen relative overflow-hidden font-display text-white">
      <SEO
        title="NearWork — Hire Local Freelancers & Skilled Workers Near You"
        description="Post a job in minutes and hire trusted local freelancers — developers, designers, writers, marketers and more. Real-time chat, secure escrow, verified reviews."
        path="/"
        keywords="freelance marketplace, hire freelancers, local workers, web developers, designers, gig work, hyperlocal jobs, escrow payments, post a job"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'NearWork — Hire Local Freelancers & Skilled Workers Near You',
            url: 'https://sweetie-pie-maker.lovable.app/',
            description:
              'Hyperlocal freelance marketplace to post jobs and hire skilled workers nearby with secure escrow and real-time chat.',
            inLanguage: 'en',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How does NearWork work?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Post a job with your budget, review proposals from nearby freelancers, chat in real time, and pay securely through milestone escrow.',
                },
              },
              {
                '@type': 'Question',
                name: 'Is NearWork free to use?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Posting jobs and browsing freelancers is free. A small platform commission is deducted from completed payments.',
                },
              },
              {
                '@type': 'Question',
                name: 'How are payments protected?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Funds are held in escrow and only released to the worker when you approve each milestone, so both sides are protected.',
                },
              },
            ],
          },
        ]}
      />
      <PremiumBackground />


      {/* ─── GLASS NAV ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(1100px,calc(100vw-24px))]"
      >
        <div className="glass-strong rounded-2xl px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#6C63FF] via-[#8B5CF6] to-[#FF4D9D] flex items-center justify-center shadow-lg shadow-[#6C63FF]/40">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">FixIt</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-sm text-white/70">
            {['Categories', 'How it works', 'Talent', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/\s/g,'-')}`}
                 className="px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors">
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="hidden sm:inline-flex text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              onClick={() => navigate('/login?role=worker')}
            >
              Sign In
            </Button>
            <Button
              className="btn-gradient text-white rounded-xl h-10 px-5 font-semibold border-0"
              onClick={() => navigate('/login?role=customer')}
            >
              Get Started
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section className="relative z-[2] min-h-screen flex flex-col items-center justify-center px-4 text-center pt-28 pb-16">
        <FloatingShapes mx={mx} my={my} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Badge className="mb-6 glass text-white/90 border-white/15 text-sm px-4 py-1.5 gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#00D4FF]" />
              Trusted by 10,000+ businesses worldwide
            </Badge>
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold leading-[1.05] tracking-tight mb-6">
            Find the Perfect<br />
            <span className="text-gradient-brand">Freelancer</span>
          </h1>

          <p className="text-lg md:text-xl text-[#D1D5DB] mb-2 max-w-2xl mx-auto">
            Hire experts or get hired — connect with top
          </p>
          <p className="text-2xl md:text-3xl font-bold text-[#00D4FF] mb-10 h-10">
            {typedRole}<span className="animate-pulse text-[#FF4D9D]">|</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="btn-gradient text-white h-14 px-8 text-base font-bold gap-3 rounded-2xl border-0"
              onClick={() => navigate('/login?role=customer')}
            >
              <User className="h-5 w-5" /> Hire a Freelancer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-bold gap-3 rounded-2xl glass text-white hover:bg-white/15 border-white/20"
              onClick={() => navigate('/login?role=worker')}
            >
              <Briefcase className="h-5 w-5" /> Find Work <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          ref={statsRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-20 grid grid-cols-3 gap-4 md:gap-6 w-full max-w-3xl"
        >
          {[
            { value: `${freelancers}K+`, label: 'Freelancers' },
            { value: `${projects}K+`,    label: 'Projects Done' },
            { value: `${(rating/10).toFixed(1)}★`, label: 'Avg Rating' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl py-5 px-3 hover-lift">
              <p className="text-3xl md:text-4xl font-extrabold text-gradient-brand">{s.value}</p>
              <p className="text-xs md:text-sm text-[#D1D5DB]/70 mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* wave divider */}
      <svg className="relative z-[2] w-full h-16 -mt-8" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
        <path d="M0,40 C360,90 1080,-10 1440,50 L1440,80 L0,80 Z" fill="rgba(108,99,255,0.08)" />
      </svg>

      {/* ─── CATEGORIES ─── */}
      <section id="categories" className="relative z-[2] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold mb-3">
              Browse by <span className="text-gradient-brand">Category</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#D1D5DB]/70 max-w-lg mx-auto">
              Explore top talent across the most in-demand fields
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.map(cat => (
              <motion.div key={cat.label} variants={fadeUp}>
                <div className="glass rounded-2xl p-5 text-center hover-lift cursor-pointer group h-full">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.hue} mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                    <cat.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-bold text-white text-sm mb-1">{cat.label}</p>
                  <p className="text-xs text-[#D1D5DB]/60">{cat.count}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURED FREELANCERS ─── */}
      <section id="talent" className="relative z-[2] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold mb-3">
              Featured <span className="text-gradient-brand">Freelancers</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#D1D5DB]/70 max-w-lg mx-auto">
              Top-rated professionals ready to work on your project
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURED.map(f => (
              <motion.div key={f.name} variants={fadeUp}>
                <div className="glass rounded-2xl p-5 hover-lift h-full flex flex-col">
                  <div className="text-4xl mb-3">{f.avatar}</div>
                  <h3 className="font-bold text-white text-lg">{f.name}</h3>
                  <p className="text-sm text-[#00D4FF] mb-2">{f.role}</p>
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" />
                    <span className="text-sm font-semibold">{f.rating}</span>
                    <span className="text-xs text-white/50">({f.reviews})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
                    {f.skills.map(s => (
                      <Badge key={s} className="bg-white/10 text-white/80 border-0 text-xs hover:bg-white/15">{s}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gradient-brand">{f.price}</span>
                    <Button size="sm" className="btn-gradient text-white rounded-xl text-xs h-8 px-4 border-0">Hire</Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="relative z-[2] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold mb-3">
              How It <span className="text-gradient-brand">Works</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#D1D5DB]/70">Get started in three simple steps</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW.map(item => (
              <motion.div key={item.step} variants={fadeUp} className="glass rounded-2xl p-8 text-center hover-lift">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] mb-5 shadow-lg shadow-[#6C63FF]/40">
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <span className="block text-xs font-bold text-[#00D4FF] mb-1 tracking-wider">STEP {item.step}</span>
                <h3 className="font-bold text-xl mb-2">{item.title}</h3>
                <p className="text-sm text-[#D1D5DB]/70 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="relative z-[2] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold mb-3">
              What Our <span className="text-gradient-brand">Users Say</span>
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <motion.div key={t.name} variants={fadeUp}>
                <div className="glass rounded-2xl p-6 hover-lift h-full">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" />
                    ))}
                  </div>
                  <p className="text-white/85 text-sm mb-5 leading-relaxed">"{t.text}"</p>
                  <div>
                    <p className="font-bold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-[#D1D5DB]/60">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="pricing" className="relative z-[2] py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center rounded-3xl p-10 md:p-16 relative overflow-hidden glass-strong"
        >
          <div className="absolute inset-0 opacity-70 pointer-events-none"
               style={{ background: 'radial-gradient(circle at 20% 20%, rgba(108,99,255,0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(255,77,157,0.30), transparent 55%)' }} />
          <div className="relative">
            <Globe className="h-10 w-10 mx-auto mb-4 text-[#00D4FF]" />
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              Ready to <span className="text-gradient-brand">Get Started?</span>
            </h2>
            <p className="text-[#D1D5DB]/80 mb-8 max-w-md mx-auto">
              Join thousands already building amazing things together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="btn-gradient text-white h-14 px-8 font-bold rounded-2xl border-0"
                onClick={() => navigate('/login?role=customer')}>
                <User className="h-5 w-5 mr-2" /> Start Hiring
              </Button>
              <Button size="lg" variant="outline"
                className="h-14 px-8 font-bold rounded-2xl glass text-white hover:bg-white/15 border-white/20"
                onClick={() => navigate('/login?role=worker')}>
                <Briefcase className="h-5 w-5 mr-2" /> Start Earning
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-[2] border-t border-white/10 py-12 px-4 mt-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {[
            { h: 'Platform',   items: ['How It Works','Pricing','Enterprise'] },
            { h: 'Categories', items: ['Web Development','Design','Marketing'] },
            { h: 'Support',    items: ['Help Center','Contact Us','AI Help Desk'] },
            { h: 'Legal',      items: ['Terms of Service','Privacy Policy','Cookie Policy'] },
          ].map(col => (
            <div key={col.h}>
              <h4 className="font-bold text-white mb-3">{col.h}</h4>
              <ul className="space-y-2 text-[#D1D5DB]/60">
                {col.items.map(i => <li key={i} className="hover:text-white transition-colors cursor-pointer">{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#D1D5DB]/50">© 2026 FixIt. All rights reserved.</p>
          <div className="flex gap-4">
            <MessageSquare className="h-5 w-5 text-white/40 hover:text-[#00D4FF] cursor-pointer transition-colors" />
            <CreditCard className="h-5 w-5 text-white/40 hover:text-[#6C63FF] cursor-pointer transition-colors" />
            <Shield className="h-5 w-5 text-white/40 hover:text-[#FF4D9D] cursor-pointer transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  );
}
