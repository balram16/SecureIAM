import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { Shield, User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { z } from 'zod';
import ThreeCursorObject from '../components/ThreeCursorObject';
import LogoIcon from '../components/LogoIcon';

const registerSchema = z.object({
  name: z.string().trim()
    .min(1, 'Name is required.')
    .min(2, 'Name must be at least 2 characters long.'),
  email: z.string().trim()
    .min(1, 'Email is required.')
    .email('Invalid email address format.'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[0-9]/, 'Password must contain at least one digit (0-9).')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (e.g., !@#$%^&*).'),
});

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const showcaseRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showcaseRef.current) return;
    const rect = showcaseRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    showcaseRef.current.style.setProperty('--mouse-x', `${x}px`);
    showcaseRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const validation = registerSchema.safeParse({ name, email, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', { name, email, password });
      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen bg-background text-foreground overflow-hidden">
      {/* Left Panel: Form (40%) */}
      <div className="lg:col-span-5 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-12 bg-card border-r border-border/40 relative">
        <div className="absolute top-8 left-8 flex items-center gap-2.5 group">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <LogoIcon className="h-5 w-5" />
          </div>
          <span className="font-bold tracking-tight text-foreground text-sm">SecureIAM</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Create Account</h2>
            <p className="text-muted-foreground text-sm mt-1.5">Register a new user account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Card className="bg-destructive/5 border-destructive/20 text-destructive text-xs shadow-sm">
                <CardContent className="p-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="font-medium">{error}</p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className="pl-10 h-10.5 bg-background/50 focus-visible:ring-primary/30"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@organization.com"
                  className="pl-10 h-10.5 bg-background/50 focus-visible:ring-primary/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-10.5 bg-background/50 focus-visible:ring-primary/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10.5 gap-2 cursor-pointer mt-2" disabled={loading}>
              {loading ? 'Creating Account...' : 'Register'}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Features Showcase (60%) */}
      <div 
        ref={showcaseRef}
        onMouseMove={handleMouseMove}
        className="lg:col-span-7 hidden lg:flex flex-col justify-center px-16 lg:px-24 py-12 relative overflow-hidden bg-zinc-950 text-zinc-100 border-l border-zinc-900 select-none group/showcase"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black -z-10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] -z-10" />
        
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 group-hover/showcase:opacity-100 transition-opacity duration-500"
          style={{
            background: 'radial-gradient(400px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255, 255, 255, 0.06), transparent)'
          }}
        />

        <div className="max-w-2xl relative z-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-bold tracking-wider uppercase mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Self-Administered IAM Platform
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-white leading-[1.15] mb-4">
                Enterprise Identity &<br />Access Management System
              </h1>
            </div>
            
            <ThreeCursorObject />
          </div>
          
          <p className="text-zinc-400 text-[14px] leading-relaxed max-w-lg mb-10">
            Empower secure access with managed policies, inline policies, permission boundaries, and intelligent authorization workflows.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl hover:border-primary/20 transition-all hover:bg-zinc-900/60 group">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                <span className="text-zinc-200 font-bold text-xs group-hover:text-primary transition-colors">IAM Evaluation Engine</span>
              </div>
              <p className="text-zinc-400 text-[11px] mt-1.5 pl-6">Granular request-level permission checks with support for explicit Deny overrides.</p>
            </div>

            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl hover:border-primary/20 transition-all hover:bg-zinc-900/60 group">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                <span className="text-zinc-200 font-bold text-xs group-hover:text-primary transition-colors">Permission Boundaries</span>
              </div>
              <p className="text-zinc-400 text-[11px] mt-1.5 pl-6">Set hard caps on user permissions, even if their policies allow more.</p>
            </div>

            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl hover:border-primary/20 transition-all hover:bg-zinc-900/60 group">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                <span className="text-zinc-200 font-bold text-xs group-hover:text-primary transition-colors">Delegation Protection</span>
              </div>
              <p className="text-zinc-400 text-[11px] mt-1.5 pl-6">Safety guardrails: users cannot grant or delegate permissions they don't already hold.</p>
            </div>

            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl hover:border-primary/20 transition-all hover:bg-zinc-900/60 group">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                <span className="text-zinc-200 font-bold text-xs group-hover:text-primary transition-colors">Managed & Inline Policies</span>
              </div>
              <p className="text-zinc-400 text-[11px] mt-1.5 pl-6">Create global managed policies or context-specific inline policies.</p>
            </div>
          </div>



        </div>
      </div>
    </div>
  );
};

export default Register;
