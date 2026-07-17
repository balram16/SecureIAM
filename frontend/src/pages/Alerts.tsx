import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { ShieldAlert, Loader2, Lock, Check, Eye, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageWrapper } from '@/components/ui/motion';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  title: string;
  severity: string;
  acknowledged: boolean;
  createdAt: string;
}

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<'403' | 'other' | null>(null);

  // Add Alert Form
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertSeverity, setNewAlertSeverity] = useState('WARNING');

  // View Details Modal
  const [viewingAlert, setViewingAlert] = useState<Alert | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setErrorState('403');
      } else {
        setErrorState('other');
        toast.error('Failed to load incident alerts.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleReadAlert = async (id: string) => {
    try {
      const res = await api.get(`/alerts/${id}`);
      setViewingAlert(res.data.data);
      toast.success('Incident spec details fetched successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch incident details.');
    }
  };

  const handleAcknowledgeAlert = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/acknowledge`);
      toast.success('Incident alert acknowledged.');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to acknowledge alert.');
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await api.delete(`/alerts/${id}`);
      toast.success('Incident alert resolved successfully.');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resolve alert.');
    }
  };

  const handleCreateAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertTitle.trim()) return;

    try {
      await api.post('/alerts', {
        title: newAlertTitle.trim(),
        severity: newAlertSeverity
      });
      toast.success('Incident alert created successfully!');
      setNewAlertTitle('');
      setShowAddAlert(false);
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to trigger alert.');
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />

        <PageWrapper>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Alerts & Monitoring</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Monitor and manage real-time active system critical incident alerts.
              </p>
            </div>
            {errorState !== '403' && (
              <Button onClick={() => setShowAddAlert(!showAddAlert)} className="gap-1.5 h-9 text-xs">
                <Plus className="h-4 w-4" />
                Create Incident Alert
              </Button>
            )}
          </div>

          {errorState === '403' ? (
            <Card className="border border-destructive/20 bg-destructive/5 rounded-2xl flex flex-col items-center justify-center p-12 text-center max-w-xl mx-auto mt-10">
              <div className="p-4 bg-destructive/15 text-destructive rounded-2xl mb-4">
                <Lock className="h-8 w-8" />
              </div>
              <CardTitle className="text-lg font-bold mb-2">Access Denied</CardTitle>
              <CardDescription className="max-w-md text-xs leading-relaxed">
                You do not possess the required policies or privileges to view the alerts dashboard.
              </CardDescription>
              <Badge variant="destructive" className="mt-4 px-3 py-1 font-mono text-[10px]">
                Required Permission: alerts:List
              </Badge>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Add form panel */}
              <AnimatePresence>
                {showAddAlert && (
                  <motion.form
                    onSubmit={handleCreateAlertSubmit}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-5 bg-card border border-border rounded-2xl space-y-4 overflow-hidden max-w-xl"
                  >
                    <h3 className="text-sm font-semibold text-foreground">Trigger New Incident Alert (alerts:Create)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Alert Title / Description</label>
                        <input
                          type="text"
                          value={newAlertTitle}
                          onChange={e => setNewAlertTitle(e.target.value)}
                          placeholder="e.g. S3 Storage Bucket publicly accessible"
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Severity Level</label>
                        <select
                          value={newAlertSeverity}
                          onChange={e => setNewAlertSeverity(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs"
                        >
                          <option value="INFO">INFO</option>
                          <option value="WARNING">WARNING</option>
                          <option value="HIGH">HIGH</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 text-xs pt-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddAlert(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm">
                        Create Alert
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full p-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading active alerts...
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-muted-foreground border border-dashed rounded-2xl">
                    No active incidents recorded. System is normal.
                  </div>
                ) : (
                  alerts.map(item => {
                    const cardThemeClass = item.acknowledged
                      ? 'border-border/40 bg-card/25 hover:bg-card/35 opacity-75 hover:opacity-100 shadow-md'
                      : item.severity === 'CRITICAL'
                        ? 'border-rose-500/25 bg-rose-500/[0.02] hover:bg-rose-500/[0.04] shadow-[0_0_15px_-3px_rgba(244,63,94,0.06)] hover:border-rose-500/40'
                        : item.severity === 'HIGH'
                          ? 'border-amber-500/25 bg-amber-500/[0.02] hover:bg-amber-500/[0.04] shadow-[0_0_15px_-3px_rgba(245,158,11,0.06)] hover:border-amber-500/40'
                          : item.severity === 'WARNING'
                            ? 'border-yellow-500/25 bg-yellow-500/[0.02] hover:bg-yellow-500/[0.04] shadow-[0_0_15px_-3px_rgba(234,179,8,0.06)] hover:border-yellow-500/40'
                            : 'border-blue-500/25 bg-blue-500/[0.02] hover:bg-blue-500/[0.04] shadow-[0_0_15px_-3px_rgba(59,130,246,0.06)] hover:border-blue-500/40';

                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          "transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden",
                          cardThemeClass
                        )}
                      >
                        <CardHeader className="p-5 pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant={
                                  item.severity === 'CRITICAL'
                                    ? 'destructive'
                                    : item.severity === 'HIGH'
                                      ? 'warning'
                                      : item.severity === 'WARNING'
                                        ? 'warning'
                                        : 'info'
                                }
                                className="text-[9px] font-bold px-2 py-0.5 tracking-wider"
                              >
                                {item.severity}
                              </Badge>
                              {item.acknowledged && (
                                <Badge
                                  variant="success"
                                  className="gap-0.5 text-[9px] font-semibold py-0.5 px-1.5 normal-case"
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  Acked
                                </Badge>
                              )}
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReadAlert(item.id)}
                              className="h-7 w-7 p-0 rounded-full border border-border/40 bg-background/30 text-muted-foreground hover:text-foreground hover:bg-accent/80 hover:border-border/80 transition-all flex items-center justify-center cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <CardTitle className="text-sm font-semibold mt-3.5 leading-relaxed text-foreground tracking-tight line-clamp-2 min-h-[40px]">
                            {item.title}
                          </CardTitle>

                          <div className="text-[10px] text-muted-foreground mt-2 font-mono flex items-center gap-1">
                            <span className="opacity-60">Ingested:</span>
                            <span>
                              {new Date(item.createdAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </CardHeader>

                        <CardContent className="p-5 pt-0">
                          <div className="flex gap-2 w-full pt-4 border-t border-border/20 mt-2">
                            {item.acknowledged ? (
                              <Button
                                size="sm"
                                disabled
                                className="flex-1 h-8 text-[11px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 opacity-80 cursor-not-allowed gap-1"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Acknowledged
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAcknowledgeAlert(item.id)}
                                className="flex-1 h-8 text-[11px] font-medium tracking-wide hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all border-border/40"
                              >
                                Acknowledge
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteAlert(item.id)}
                              className="flex-1 h-8 text-[11px] font-medium tracking-wide bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-500 transition-all shadow-none hover:shadow-lg hover:shadow-rose-500/25"
                            >
                              Resolve
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW DETAILS MODAL */}
          <AnimatePresence>
            {viewingAlert && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
                >
                  <button
                    onClick={() => setViewingAlert(null)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground">Incident Spec sheet</h2>
                      <p className="text-[11px] text-muted-foreground font-mono">ID: {viewingAlert.id}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs border-t border-border/40 pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Incident Description:</span>
                      <span className="font-semibold text-foreground text-right max-w-[200px] inline-block">{viewingAlert.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Severity Level:</span>
                      <Badge variant={viewingAlert.severity === 'CRITICAL' ? 'destructive' : 'warning'}>
                        {viewingAlert.severity}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Acknowledge Status:</span>
                      <Badge variant={viewingAlert.acknowledged ? 'success' : 'outline'}>
                        {viewingAlert.acknowledged ? 'Acknowledged' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingested Timestamp:</span>
                      <span className="text-muted-foreground">{new Date(viewingAlert.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </PageWrapper>
      </div>
    </div>
  );
};

export default Alerts;
