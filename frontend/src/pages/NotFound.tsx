import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background orbs */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.08, 0.05] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-primary rounded-full blur-[120px] -z-10"
      />
      <motion.div
        animate={{ scale: [1.15, 1, 1.15], opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-destructive rounded-full blur-[120px] -z-10"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center"
      >
        <div className="inline-flex p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl shadow-lg shadow-destructive/5 mb-6">
          <ShieldAlert className="h-10 w-10 animate-pulse" />
        </div>

        <h1 className="text-6xl font-black tracking-tighter text-foreground/90 mb-2 font-mono">404</h1>
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-3">Resource Not Found</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8 leading-relaxed">
          The console route you are trying to access does not exist.
        </p>

        <Card className="border-border/60">
          <CardContent className="p-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="gap-2 shrink-0 cursor-pointer text-xs h-9"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Go Back</span>
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              className="gap-2 shrink-0 cursor-pointer text-xs h-9"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Go to Dashboard</span>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default NotFound;
