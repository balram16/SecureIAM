import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { Shield, User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().trim()
    .min(1, 'Name is required.')
    .min(2, 'Name must be at least 2 characters long.'),
  email: z.string().trim()
    .min(1, 'Email is required.')
    .email('Invalid email address format.'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long.'),
});

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      await api.post('/auth/register', validation.data);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid grid-cols-1 lg:grid-cols-12 overflow-hidden text-foreground">
      {/* Left Panel: Register Form (40%) */}
      <div className="lg:col-span-5 flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-12 relative bg-background">
        {/* Animated background glow */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] -z-10" />
        
        <div className="w-full max-w-md mx-auto">
          {/* Logo and Headings */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="p-2 bg-primary/10 text-primary border border-primary/20 rounded-xl shadow-md">
              <Shield className="h-5.5 w-5.5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-foreground">SecureIAM</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Create Account</h2>
            <p className="text-muted-foreground mt-2 text-sm">Join the SecureIAM organization portal</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-3 text-sm"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4.5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="name@org.local"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-3 group"
              size="lg"
            >
              <span>{loading ? 'Creating Account...' : 'Register'}</span>
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
      <div className="lg:col-span-7 hidden lg:flex flex-col justify-center px-16 lg:px-24 py-12 relative overflow-hidden bg-zinc-950 text-zinc-100 border-l border-zinc-900 select-none">
        {/* Modern dark theme layout background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black -z-10" />
        
        {/* Grid Overlay for technical look */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] -z-10" />
        
        {/* Glowing orb */}
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[140px] -z-10" />

        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-bold tracking-wider uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Self-Administered IAM Platform
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-[1.15] mb-4">
            Enterprise Identity &<br />Access Management System
          </h1>
          
          <p className="text-zinc-400 text-[14px] leading-relaxed max-w-lg mb-10">
            Empower secure access with managed policies, inline policies, permission boundaries, and intelligent authorization workflows.
          </p>

          {/* Feature cards list */}
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
