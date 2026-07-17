import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Plus, Trash2, FileText, Loader2, Lock, Eye, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageWrapper } from '@/components/ui/motion';
import { toast } from 'sonner';

interface Report {
  id: string;
  name: string;
  category: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<'403' | 'other' | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal/Form
  const [newReportName, setNewReportName] = useState('');
  const [newReportCategory, setNewReportCategory] = useState('');
  const [newReportDescription, setNewReportDescription] = useState('');
  const [showAddReport, setShowAddReport] = useState(false);

  // Edit Modal/Form
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // View Details Modal
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await api.get('/reports');
      setReports(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setErrorState('403');
      } else {
        setErrorState('other');
        toast.error('Failed to load BI reports.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportName.trim() || !newReportCategory.trim()) return;

    try {
      await api.post('/reports', {
        name: newReportName.trim(),
        category: newReportCategory.trim(),
        description: newReportDescription.trim()
      });
      toast.success('Report created successfully.');
      setNewReportName('');
      setNewReportCategory('');
      setNewReportDescription('');
      setShowAddReport(false);
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create report.');
    }
  };

  const handleReadReport = async (id: string) => {
    try {
      const res = await api.get(`/reports/${id}`);
      setViewingReport(res.data.data);
      toast.success('Report details fetched successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch report details.');
    }
  };

  const handleEditClick = (rep: Report) => {
    setEditingReport(rep);
    setEditName(rep.name);
    setEditCategory(rep.category);
    setEditDescription(rep.description || '');
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !editName.trim() || !editCategory.trim()) return;

    try {
      await api.put(`/reports/${editingReport.id}`, {
        name: editName.trim(),
        category: editCategory.trim(),
        description: editDescription.trim()
      });
      toast.success('Report updated successfully.');
      setEditingReport(null);
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update report.');
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await api.delete(`/reports/${id}`);
      toast.success('Report deleted successfully.');
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete report.');
    }
  };

  const filteredReports = reports.filter(rep =>
    rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rep.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />

        <PageWrapper>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Reports Service</h1>
              <p className="text-muted-foreground text-sm mt-1">
                View, generate, edit, and govern organizational business intelligence reports.
              </p>
            </div>
            {errorState !== '403' && (
              <Button onClick={() => setShowAddReport(!showAddReport)} className="gap-1.5 h-9 text-xs">
                <Plus className="h-4 w-4" />
                Add Custom Report
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
                You do not possess the required policies or privileges to access the reports dashboard.
              </CardDescription>
              <Badge variant="destructive" className="mt-4 px-3 py-1 font-mono text-[10px]">
                Required Permission: reports:List
              </Badge>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Add form panel */}
              <AnimatePresence>
                {showAddReport && (
                  <motion.form
                    onSubmit={handleCreateReport}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-5 bg-card border border-border rounded-2xl space-y-4 overflow-hidden max-w-xl"
                  >
                    <h3 className="text-sm font-semibold text-foreground">Create New Report (reports:Create)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Report Name</label>
                        <input
                          type="text"
                          value={newReportName}
                          onChange={e => setNewReportName(e.target.value)}
                          placeholder="e.g. Q3 Sales Metrics"
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
                        <input
                          type="text"
                          value={newReportCategory}
                          onChange={e => setNewReportCategory(e.target.value)}
                          placeholder="e.g. Finance"
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
                      <textarea
                        value={newReportDescription}
                        onChange={e => setNewReportDescription(e.target.value)}
                        placeholder="Provide details about the report contents, purpose, and audience..."
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs h-16 resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 text-xs pt-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddReport(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm">
                        Create Report
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Table search bar */}
              <div className="max-w-xs">
                <input
                  type="text"
                  placeholder="Search reports by name or category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs"
                />
              </div>

              {/* Report Table Card */}
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground font-medium uppercase text-[10px]">
                        <th className="p-4 pl-6">Report ID</th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Description</th>
                        <th className="p-4">Created By</th>
                        <th className="p-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                            Loading reports database...
                          </td>
                        </tr>
                      ) : filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No reports found in system.
                          </td>
                        </tr>
                      ) : (
                        filteredReports.map(rep => (
                          <tr key={rep.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                            <td className="p-4 pl-6 font-mono text-muted-foreground text-[10px]">{rep.id.slice(0, 8)}...</td>
                            <td className="p-4 font-semibold text-foreground flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              {rep.name}
                            </td>
                            <td className="p-4"><Badge variant="outline">{rep.category}</Badge></td>
                            <td className="p-4 text-muted-foreground max-w-[200px] truncate" title={rep.description || ''}>
                              {rep.description || <span className="italic text-muted-foreground/60">No description</span>}
                            </td>
                            <td className="p-4 text-muted-foreground">{rep.createdBy}</td>
                            <td className="p-4 pr-6 text-right space-x-1.5 whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReadReport(rep.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="View Details (reports:Read)"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(rep)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Edit Report (reports:Update)"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteReport(rep.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete Report (reports:Delete)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* VIEW DETAILS MODAL */}
          <AnimatePresence>
            {viewingReport && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
                >
                  <button
                    onClick={() => setViewingReport(null)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground">BI Report Detail Sheet</h2>
                      <p className="text-[11px] text-muted-foreground font-mono">ID: {viewingReport.id}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs border-t border-border/40 pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Report Document Name:</span>
                      <span className="font-semibold text-foreground">{viewingReport.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category Classification:</span>
                      <Badge variant="outline">{viewingReport.category}</Badge>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border/20">
                      <span className="text-muted-foreground">Description:</span>
                      <p className="font-medium text-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40 leading-relaxed max-h-32 overflow-y-auto">
                        {viewingReport.description || <span className="italic text-muted-foreground/60">No description provided.</span>}
                      </p>
                    </div>
                    <div className="flex justify-between border-t border-border/20 pt-3">
                      <span className="text-muted-foreground">Report Creator context:</span>
                      <span className="font-medium text-foreground">{viewingReport.createdBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingestion Date:</span>
                      <span className="text-muted-foreground">{new Date(viewingReport.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Modification:</span>
                      <span className="text-muted-foreground">{new Date(viewingReport.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* EDIT REPORT MODAL */}
          <AnimatePresence>
            {editingReport && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.form
                  onSubmit={handleUpdateReport}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
                >
                  <button
                    type="button"
                    onClick={() => setEditingReport(null)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                      <Edit2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground font-semibold">Update Document Settings</h2>
                      <p className="text-[11px] text-muted-foreground font-mono">ID: {editingReport.id.slice(0, 12)}...</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 pt-2 border-t border-border/30">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Document Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Category Classification</label>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={e => setEditCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
                      <textarea
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs h-16 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 text-xs pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingReport(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm">
                      Apply Updates
                    </Button>
                  </div>
                </motion.form>
              </div>
            )}
          </AnimatePresence>

        </PageWrapper>
      </div>
    </div>
  );
};

export default Reports;
