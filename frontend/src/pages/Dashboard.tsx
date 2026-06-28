import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageWrapper, fadeInUp, staggerContainer } from '@/components/ui/motion';
import { useAuth } from '../context/AuthContext';

interface TestActionItem {
  name: string;
  action: string;
  method: string;
  url: string;
  body?: any;
}

interface TestResult {
  status: string;
  code: number | null;
}

const Dashboard = () => {
  const { user } = useAuth();

  const resourceCategories = [
    {
      title: 'Reports Service',
      description: 'Generate, export and view business intelligence documents.',
      actions: [
        { name: 'List Reports', action: 'reports:List', method: 'GET', url: '/reports' },
        { name: 'Read Report Details', action: 'reports:Read', method: 'GET', url: '/reports/123' },
        { name: 'Create New Report', action: 'reports:Create', method: 'POST', url: '/reports', body: {} },
        { name: 'Update Report Settings', action: 'reports:Update', method: 'PUT', url: '/reports/123', body: {} },
        { name: 'Delete Report Entry', action: 'reports:Delete', method: 'DELETE', url: '/reports/123' },
      ]
    },
    {
      title: 'Alerts & Monitoring',
      description: 'Receive real-time alerts and trigger system-wide fail-safes.',
      actions: [
        { name: 'List Active Alerts', action: 'alerts:List', method: 'GET', url: '/alerts' },
        { name: 'Read Alert Specs', action: 'alerts:Read', method: 'GET', url: '/alerts/123' },
        { name: 'Trigger Manual Alert', action: 'alerts:Create', method: 'POST', url: '/alerts', body: {} },
        { name: 'Acknowledge Incident', action: 'alerts:Acknowledge', method: 'PATCH', url: '/alerts/123/acknowledge', body: {} },
        { name: 'Delete Resolved Alert', action: 'alerts:Delete', method: 'DELETE', url: '/alerts/123' },
      ]
    },
    {
      title: 'Global Settings',
      description: 'System preferences and tenant configurations.',
      actions: [
        { name: 'Read Preferences', action: 'settings:Read', method: 'GET', url: '/settings' },
        { name: 'Update Core Settings', action: 'settings:Update', method: 'PUT', url: '/settings', body: {} },
      ]
    },
    {
      title: 'System Audit Logs',
      description: 'Inflexible compliance ledger storing admin activity logs.',
      actions: [
        { name: 'List Action Logs', action: 'audit:List', method: 'GET', url: '/audit' },
        { name: 'Read Logs Specifics', action: 'audit:Read', method: 'GET', url: '/audit/123' },
      ]
    }
  ];

  // Store results for each action
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const handleTestAction = async (item: TestActionItem) => {
    const key = item.action;
    setResults(prev => ({
      ...prev,
      [key]: { status: 'loading', code: null }
    }));

    try {
      let res;
      if (item.method === 'GET') {
        res = await api.get(item.url);
      } else if (item.method === 'POST') {
        res = await api.post(item.url, item.body || {});
      } else if (item.method === 'PUT') {
        res = await api.put(item.url, item.body || {});
      } else if (item.method === 'PATCH') {
        res = await api.patch(item.url, item.body || {});
      } else if (item.method === 'DELETE') {
        res = await api.delete(item.url);
      } else {
        throw new Error('Unsupported method');
      }

      if (res.data.success || res.status === 200) {
        setResults(prev => ({
          ...prev,
          [key]: { status: 'allowed', code: 200 }
        }));
      } else {
        setResults(prev => ({
          ...prev,
          [key]: { status: 'denied', code: res.status }
        }));
      }
    } catch (err: any) {
      const code = err.response?.status || 500;
      if (code === 403) {
        setResults(prev => ({
          ...prev,
          [key]: { status: 'denied', code: 403 }
        }));
      } else {
        setResults(prev => ({
          ...prev,
          [key]: { status: 'error', code }
        }));
      }
    }
  };

  const handleReset = () => {
    setResults({});
  };

  const getMethodBadgeVariant = (method: string) => {
    switch (method) {
      case 'GET': return 'info';
      case 'POST': return 'success';
      case 'PUT': return 'warning';
      case 'PATCH': return 'default';
      case 'DELETE': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBadge = (res: TestResult | undefined) => {
    if (!res) {
      return <Badge variant="secondary" className="text-[9px]">Not Tested</Badge>;
    }
    if (res.status === 'loading') {
      return (
        <Badge variant="warning" className="text-[9px] animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" />
          Testing...
        </Badge>
      );
    }
    if (res.status === 'allowed') {
      return (
        <Badge variant="success" className="text-[9px]">
          <ShieldCheck className="h-3 w-3" />
          Allowed (200)
        </Badge>
      );
    }
    if (res.status === 'denied') {
      return (
        <Badge variant="destructive" className="text-[9px]">
          <AlertTriangle className="h-3 w-3" />
          Denied (403)
        </Badge>
      );
    }
    return <Badge variant="warning" className="text-[9px]">Err ({res.code})</Badge>;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />

        <PageWrapper>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Resource Action Center</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Verify your active permissions by dispatching authenticated requests to dummy system APIs.
              </p>
            </div>
            <Button onClick={handleReset} variant="outline" className="self-start md:self-auto gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset Console
            </Button>
          </div>

          {/* Action Grids */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 xl:grid-cols-2 gap-5"
          >
            {resourceCategories.map((category, catIdx) => (
              <motion.div key={category.title} variants={fadeInUp}>
                <Card className="h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">{category.title}</CardTitle>
                    <CardDescription className="text-xs">{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {category.actions.map((item) => {
                      const testResult = results[item.action];
                      return (
                        <div
                          key={item.action}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background/60 border border-border/50 hover:border-border rounded-xl transition-all gap-3"
                        >
                          <div className="overflow-hidden pr-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={getMethodBadgeVariant(item.method) as any} className="text-[9px] font-mono">
                                {item.method}
                              </Badge>
                              <span className="text-sm font-medium text-foreground">{item.name}</span>
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground mt-1 select-all">{item.action}</div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={testResult?.status || 'idle'}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                              >
                                {getStatusBadge(testResult)}
                              </motion.div>
                            </AnimatePresence>
                            <Button
                              onClick={() => handleTestAction(item)}
                              disabled={testResult?.status === 'loading'}
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              title="Execute Test Request"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </PageWrapper>
      </div>
    </div>
  );
};

export default Dashboard;
