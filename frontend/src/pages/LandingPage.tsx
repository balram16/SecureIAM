import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Users, Key,
  ArrowRight, CheckCircle2, Zap, Eye, Layers, GitBranch,
  ChevronRight, Sparkles, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LogoIcon from '../components/LogoIcon';
import { HeroScene3D, FloatingAccent3D, NetworkGlobe3D } from '../components/HeroScene3D';

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number = 0) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const ScrollReveal = ({
  children, className = '', variants = fadeUp, custom = 0,
}: {
  children: React.ReactNode; className?: string;
  variants?: any; custom?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref} initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants} custom={custom} className={className}
    >{children}</motion.div>
  );
};

/* ─── data ─── */
const features = [
  { icon: Zap, title: 'IAM Evaluation Engine', desc: 'Granular request-level permission checks with support for explicit Deny overrides and wildcard matching.', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { icon: Shield, title: 'Permission Boundaries', desc: 'Set hard caps on user permissions, even if their attached policies allow more access.', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { icon: Lock, title: 'Delegation Protection', desc: "Safety guardrails ensure users cannot grant or delegate permissions they don't already hold.", color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { icon: Layers, title: 'Managed & Inline Policies', desc: 'Create globally reusable managed policies or attach context-specific inline policies to users.', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { icon: Eye, title: 'Real-time Audit Logging', desc: 'Immutable compliance ledger tracking every security modification, access attempt, and policy change.', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { icon: Users, title: 'Role-Based Access Control', desc: 'Organize users into groups with shared policy sets for scalable, maintainable access governance.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
];

const steps = [
  { num: '01', title: 'Create Users & Groups', desc: 'Register operators, organize them into logical groups, and establish your organizational hierarchy.', icon: Users },
  { num: '02', title: 'Attach Policies & Boundaries', desc: 'Define fine-grained JSON policy statements and attach them to users or groups. Set permission boundaries as guardrails.', icon: Key },
  { num: '03', title: 'Evaluate & Monitor', desc: 'The IAM engine evaluates every request in real-time. View audit logs, manage alerts, and generate compliance reports.', icon: Activity },
];

/* ════════════════════════════════════════════ */
/*                LANDING PAGE                 */
/* ════════════════════════════════════════════ */

const LandingPage = () => {
  const featuresRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden selection:bg-blue-500/30">
      {/* ══════ BACKGROUNDS ══════ */}
      <div className="fixed inset-0 -z-20 bg-black" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* ══════ STICKY NAVBAR ══════ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <LogoIcon className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-white text-sm">SecureIAM</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo(featuresRef)} className="text-zinc-400 hover:text-white text-sm transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollTo(howItWorksRef)} className="text-zinc-400 hover:text-white text-sm transition-colors cursor-pointer">How It Works</button>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-white/[0.06] h-9 text-sm cursor-pointer">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button className="h-9 text-sm gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════ */}
      {/*              HERO SECTION                  */}
      {/* ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* ★ FULL-SCREEN 3D SCENE ★ */}
        <div className="absolute inset-0 z-0">
          <HeroScene3D />
        </div>

        {/* Gradient overlays to ensure text readability */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/80 via-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-24 w-full relative z-[2]">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-blue-300 tracking-wider uppercase">Enterprise IAM Platform</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
            >
              <span className="text-white">Secure Your </span>
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-violet-500 bg-clip-text text-transparent">Infrastructure</span>
              <br />
              <span className="text-white">With </span>
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Zero Trust</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="text-zinc-400 text-lg leading-relaxed max-w-lg mb-10"
            >
              Empower your organization with fine-grained access controls,
              managed policies, permission boundaries, and real-time audit
              compliance — all in one self-hosted platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-4 mb-12"
            >
              <Link to="/register">
                <Button className="h-12 px-8 text-sm gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/25 cursor-pointer">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="h-12 px-8 text-sm gap-2 border border-white/15 hover:bg-white/[0.06] text-zinc-300 hover:text-white backdrop-blur-sm cursor-pointer">
                  Sign In to Console <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Floating stat pills */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex flex-wrap gap-3">
              {[
                { label: '99.99% Uptime', icon: Sparkles },
                { label: 'Zero-Trust Architecture', icon: ShieldCheck },
                { label: 'SOC 2 Compliant', icon: CheckCircle2 },
              ].map((pill) => (
                <div key={pill.label} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full backdrop-blur-sm">
                  <pill.icon className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px] font-medium text-zinc-400">{pill.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[2]">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/*            FEATURES SECTION                */}
      {/* ══════════════════════════════════════════ */}
      <section ref={featuresRef} className="relative py-32 scroll-mt-20">
        {/* 3D accent in corner */}
        <div className="absolute -right-20 top-10 w-[400px] h-[400px] opacity-40">
          <FloatingAccent3D className="w-full h-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <ScrollReveal className="text-center mb-16">
            <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1">
              <Layers className="h-3 w-3 mr-1.5" />
              Core Capabilities
            </Badge>
            <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Govern Access</span>
            </h2>
            <p className="text-zinc-400 text-base max-w-2xl mx-auto leading-relaxed">
              A comprehensive suite of identity and access management tools designed for modern enterprise security architectures.
            </p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} variants={scaleIn} custom={i}>
                <div className="group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-500 h-full cursor-default">
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_70%)]" />
                  <div className="relative z-10">
                    <div className={`inline-flex p-2.5 rounded-xl ${f.bg} ${f.border} border mb-4`}>
                      <f.icon className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <h3 className="text-white font-bold text-sm mb-2 group-hover:text-blue-300 transition-colors">{f.title}</h3>
                    <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/*            HOW IT WORKS                    */}
      {/* ══════════════════════════════════════════ */}
      <section ref={howItWorksRef} className="relative py-32 scroll-mt-20">
        {/* 3D Globe accent */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-[350px] h-[350px] opacity-30">
          <NetworkGlobe3D className="w-full h-full" />
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-600/[0.04] rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <ScrollReveal className="text-center mb-20">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1">
              <GitBranch className="h-3 w-3 mr-1.5" />
              Workflow
            </Badge>
            <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4">
              How It{' '}<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-zinc-400 text-base max-w-xl mx-auto leading-relaxed">
              Three simple steps to enterprise-grade access management.
            </p>
          </ScrollReveal>

          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-violet-500/40 to-emerald-500/40 hidden md:block" />
            <div className="space-y-16">
              {steps.map((step, i) => (
                <ScrollReveal key={step.num} custom={i} className="relative">
                  <div className="flex items-start gap-8 md:gap-12">
                    <div className="relative shrink-0 hidden md:flex">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative z-10">
                        <span className="text-lg font-extrabold bg-gradient-to-br from-blue-400 to-violet-400 bg-clip-text text-transparent">{step.num}</span>
                      </div>
                    </div>
                    <div className="flex-1 group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500">
                      <div className="flex items-center gap-3 mb-3">
                        <step.icon className="h-5 w-5 text-blue-400" />
                        <h3 className="text-white font-bold text-base">{step.title}</h3>
                      </div>
                      <p className="text-zinc-500 text-sm leading-relaxed pl-8">{step.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/*               CTA SECTION                  */}
      {/* ══════════════════════════════════════════ */}
      <section className="relative py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <ScrollReveal>
            <div className="p-12 md:p-16 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-6">
                  <ShieldCheck className="h-8 w-8 text-blue-400" />
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
                  Ready to Secure Your<br />
                  <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Infrastructure?</span>
                </h2>
                <p className="text-zinc-400 text-base max-w-lg mx-auto mb-10 leading-relaxed">
                  Start managing access controls with enterprise-grade security. Self-hosted, fully customizable, and ready to deploy.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/register">
                    <Button className="h-12 px-10 text-sm gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/25 cursor-pointer">
                      Create Free Account <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="ghost" className="h-12 px-10 text-sm border border-white/10 hover:bg-white/[0.05] text-zinc-300 hover:text-white cursor-pointer">Sign In</Button>
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <LogoIcon className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight text-zinc-400 text-xs">SecureIAM</span>
          </div>
          <p className="text-zinc-600 text-xs">
            Built with ❤️ for enterprise security &middot; &copy; {new Date().getFullYear()} SecureIAM
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
