import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { List, Loader2, Lock, RotateCcw, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageWrapper } from '@/components/ui/motion';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

const AuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<'403' | 'other' | null>(null);

  // View Details Modal
  const [viewingLog, setViewingLog] = useState<AuditLog | null>(null);

  const fetchAuditData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await api.get('/audit');
      setAuditLogs(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setErrorState('403');
      } else {
        setErrorState('other');
        toast.error('Failed to load compliance ledger logs.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const handleReadAudit = async (id: string) => {
    try {
      const res = await api.get(`/audit/${id}`);
      setViewingLog(res.data.data);
      toast.success('Audit log details fetched successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch audit log details.');
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
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Compliance Audit Logs</h1>
              <p className="text-muted-foreground text-sm mt-1">
                View the immutable ledger tracking security modifications and operations.
              </p>
            </div>
            {errorState !== '403' && (
              <Button onClick={fetchAuditData} variant="outline" className="h-9 text-xs gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Reload Logs
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
                You do not possess the required policies or privileges to read compliance ledger logs.
              </CardDescription>
              <Badge variant="destructive" className="mt-4 px-3 py-1 font-mono text-[10px]">
                Required Permission: audit:List
              </Badge>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground font-medium uppercase text-[10px]">
                      <th className="p-4 pl-6">Timestamp</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Ledger Details</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                          Loading compliance ledger...
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No ledger logs recorded.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                          <td className="p-4 pl-6 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4 font-semibold text-foreground whitespace-nowrap">
                            {log.userName}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <Badge variant="outline" className="font-mono text-[9px] tracking-wide">
                              {log.action}
                            </Badge>
                          </td>
                          <td className="p-4 leading-relaxed max-w-sm text-foreground/80">
                            {log.details}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReadAudit(log.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="View Log Details (audit:Read)"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* VIEW DETAILS MODAL */}
          <AnimatePresence>
            {viewingLog && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
                >
                  <button
                    onClick={() => setViewingLog(null)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                      <List className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground">Compliance Log Details</h2>
                      <p className="text-[11px] text-muted-foreground font-mono">Log ID: {viewingLog.id}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs border-t border-border/40 pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operator ID:</span>
                      <span className="font-mono text-[10px] text-foreground">{viewingLog.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operator Name:</span>
                      <span className="font-semibold text-foreground">{viewingLog.userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Action Run:</span>
                      <Badge variant="outline" className="font-mono">{viewingLog.action}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Log Details:</span>
                      <span className="font-medium text-foreground text-right max-w-[200px] inline-block">{viewingLog.details}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Logged Time:</span>
                      <span className="text-muted-foreground">{new Date(viewingLog.timestamp).toLocaleString()}</span>
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

export default AuditLogs;
