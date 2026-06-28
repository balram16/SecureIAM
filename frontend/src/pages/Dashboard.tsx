import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Play, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

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
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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

  // Store results for each action in an object: { 'reports:List': { status: 'idle|loading|allowed|denied', code: null } }
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

  const getStatusBadge = (res: TestResult | undefined) => {
    if (!res) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-800/40 border border-slate-700/50 rounded-lg">
          Not Tested
        </span>
      );
    }
    if (res.status === 'loading') {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg animate-pulse">
          Testing...
        </span>
      );
    }
    if (res.status === 'allowed') {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-1">
          <ShieldCheck className="h-3 w-3 shrink-0" />
          <span>Allowed (200)</span>
        </span>
      );
    }
    if (res.status === 'denied') {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center space-x-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Denied (403)</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        Err ({res.code})
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      <Sidebar />
      
      {/* Main Content Scroll container */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-8 relative">
        {/* Glow effects */}
        <div className="absolute top-10 right-10 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl -z-10"></div>

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Resource Action Center</h1>
            <p className="text-slate-400 text-sm mt-1">
              Verify your active permissions by dispatching authenticated requests to dummy system APIs.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="self-start md:self-auto flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer text-sm font-semibold shadow-md"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Test Console</span>
          </button>
        </div>

        {/* Action Grids */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {resourceCategories.map((category) => (
            <div
              key={category.title}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{category.title}</h3>
                <p className="text-xs text-slate-400 mb-6">{category.description}</p>
                
                <div className="space-y-3">
                  {category.actions.map((item) => {
                    const testResult = results[item.action];
                    return (
                      <div
                        key={item.action}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-2xl transition-all gap-3"
                      >
                        <div className="overflow-hidden pr-2">
                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                              item.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              item.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              item.method === 'PUT' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              item.method === 'PATCH' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {item.method}
                            </span>
                            <span className="text-sm font-semibold text-slate-200">{item.name}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-1 select-all">{item.action}</div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-auto">
                          {getStatusBadge(testResult)}
                          <button
                            onClick={() => handleTestAction(item)}
                            disabled={testResult?.status === 'loading'}
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-indigo-600/10 transition-all cursor-pointer"
                            title="Execute Test Request"
                          >
                            <Play className="h-4 w-4 fill-white" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
