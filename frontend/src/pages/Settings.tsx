import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Settings as SettingsIcon, Loader2, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageWrapper } from '@/components/ui/motion';
import { toast } from 'sonner';

interface Setting {
  id: string;
  sessionTimeout: number;
  mfaRequired: boolean;
  allowedIps: string;
  updatedBy: string;
  updatedAt: string;
}

const Settings = () => {
  const [sysSettings, setSysSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<'403' | 'other' | null>(null);
  const [timeoutInput, setTimeoutInput] = useState('30');
  const [mfaInput, setMfaInput] = useState(false);
  const [ipsInput, setIpsInput] = useState('*');

  const fetchSettings = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await api.get('/settings');
      const data = res.data.data;
      setSysSettings(data);
      setTimeoutInput(String(data.sessionTimeout));
      setMfaInput(data.mfaRequired);
      setIpsInput(data.allowedIps);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setErrorState('403');
      } else {
        setErrorState('other');
        toast.error('Failed to load system configurations.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await api.put('/settings', {
        sessionTimeout: parseInt(timeoutInput, 10),
        mfaRequired: mfaInput,
        allowedIps: ipsInput
      });
      toast.success('Tenant settings updated successfully.');
      fetchSettings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update system configurations.');
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
              <h1 className="text-2xl font-bold text-foreground tracking-tight">System Settings</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Configure global tenant preferences, compliance parameters, and whitelist rules.
              </p>
            </div>
          </div>

          {errorState === '403' ? (
            <Card className="border border-destructive/20 bg-destructive/5 rounded-2xl flex flex-col items-center justify-center p-12 text-center max-w-xl mx-auto mt-10">
              <div className="p-4 bg-destructive/15 text-destructive rounded-2xl mb-4">
                <Lock className="h-8 w-8" />
              </div>
              <CardTitle className="text-lg font-bold mb-2">Access Denied</CardTitle>
              <CardDescription className="max-w-md text-xs leading-relaxed">
                You do not possess the required policies or privileges to view system settings.
              </CardDescription>
              <Badge variant="destructive" className="mt-4 px-3 py-1 font-mono text-[10px]">
                Required Permission: settings:Read
              </Badge>
            </Card>
          ) : (
            <div className="max-w-xl">
              {loading && !sysSettings ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading configuration parameters...
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">
                        Auth Session Timeout (Minutes)
                      </label>
                      <input
                        type="number"
                        value={timeoutInput}
                        onChange={e => setTimeoutInput(e.target.value)}
                        className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/20 border border-border/40 rounded-xl">
                      <div className="pr-4">
                        <div className="text-xs font-bold text-foreground">Enforce Operator Multi-Factor Authentication</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">Require MFA credentials during sensitive operations.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={mfaInput}
                        onChange={e => setMfaInput(e.target.checked)}
                        className="h-4 w-4 text-primary bg-background border-border rounded focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">
                        Network Whitelist IP Address Ranges
                      </label>
                      <input
                        type="text"
                        value={ipsInput}
                        onChange={e => setIpsInput(e.target.value)}
                        placeholder="e.g. 127.0.0.1, 192.168.1.*"
                        className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>

                    {sysSettings && (
                      <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between border-t border-border/30 mt-3">
                        <span>Last modified by: <strong>{sysSettings.updatedBy}</strong></span>
                        <span>Updated: <strong>{new Date(sysSettings.updatedAt).toLocaleString()}</strong></span>
                      </div>
                    )}

                    <div className="flex justify-end pt-3">
                      <Button onClick={handleSaveSettings} className="gap-1.5 text-xs h-9">
                        <Save className="h-4 w-4" />
                        Save Configurations
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </PageWrapper>
      </div>
    </div>
  );
};

export default Settings;
