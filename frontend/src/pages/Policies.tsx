import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Plus, Trash2, Edit3, Eye, FileText, ChevronLeft, AlertCircle, Search, X } from 'lucide-react';
import { Policy, User, Group, Statement } from '../types/iam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { PageWrapper, fadeInUp, scaleIn } from '@/components/ui/motion';

const VALID_ACTIONS = [
  // Resource Actions
  'reports:List', 'reports:Read', 'reports:Create', 'reports:Update', 'reports:Delete',
  'alerts:List', 'alerts:Read', 'alerts:Create', 'alerts:Acknowledge', 'alerts:Delete',
  'settings:Read', 'settings:Update',
  'audit:List', 'audit:Read',
  // IAM Actions
  'iam:ListPolicies', 'iam:GetPolicy', 'iam:CreatePolicy', 'iam:UpdatePolicy', 'iam:DeletePolicy',
  'iam:ListGroups', 'iam:GetGroup', 'iam:CreateGroup', 'iam:UpdateGroup', 'iam:DeleteGroup',
  'iam:AddUserToGroup', 'iam:RemoveUserFromGroup', 'iam:AttachGroupPolicy', 'iam:DetachGroupPolicy',
  'iam:ListUsers', 'iam:GetUser', 'iam:AttachUserPolicy', 'iam:DetachUserPolicy',
  'iam:PutUserBoundary', 'iam:DeleteUserBoundary'
];

const Policies = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('MANAGED');
  const [statements, setStatements] = useState<Statement[]>([
    { Effect: 'Allow', Action: [], Resource: ['*'] }
  ]);
  const [attachToType, setAttachToType] = useState<'user' | 'group'>('user');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [groupsList, setGroupsList] = useState<Group[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [actionSearch, setActionSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // TanStack Query for server state
  const { data: policies = [], isLoading: isPoliciesLoading, error: queryError } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: async () => {
      const res = await api.get('/iam/policies');
      return res.data.data;
    }
  });

  useEffect(() => {
    if (queryError) {
      setError((queryError as any).response?.data?.message || 'Failed to fetch policies. Verify your access rights.');
    }
  }, [queryError]);

  const fetchPolicies = async () => {
    await queryClient.invalidateQueries({ queryKey: ['policies'] });
  };

  const fetchPolicyDetails = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/iam/policies/${id}`);
      setSelectedPolicy(res.data.data);
      setView('detail');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch policy details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersAndGroups = async () => {
    try {
      const [uRes, gRes] = await Promise.all([
        api.get('/iam/users'),
        api.get('/iam/groups')
      ]);
      setUsersList(uRes.data.data);
      setGroupsList(gRes.data.data);
    } catch (err) {
      console.error('Failed to prefetch users or groups', err);
    }
  };

  const handleCreateOpen = () => {
    setName('');
    setDescription('');
    setType('MANAGED');
    setStatements([{ Effect: 'Allow', Action: [], Resource: ['*'] }]);
    setAttachToType('user');
    setTargetUserId('');
    setTargetGroupId('');
    setError('');
    setView('create');
    fetchUsersAndGroups();
  };

  const handleEditOpen = (policy: Policy) => {
    setSelectedPolicy(policy);
    setName(policy.name);
    setDescription(policy.description || '');
    setType(policy.type);
    
    // Parse statements
    const stmts = policy.statements?.statements || [];
    setStatements(stmts.map(s => ({
      Effect: s.Effect || 'Allow',
      Action: s.Action || [],
      Resource: s.Resource || ['*']
    })));
    setError('');
    setView('edit');
  };

  const handleAddStatement = () => {
    setStatements([...statements, { Effect: 'Allow', Action: [], Resource: ['*'] }]);
  };

  const handleRemoveStatement = (index: number) => {
    if (statements.length === 1) return;
    setStatements(statements.filter((_, i) => i !== index));
  };

  const handleStatementChange = (index: number, field: keyof Statement, value: any) => {
    const updated = [...statements];
    (updated[index] as any)[field] = value;
    setStatements(updated);
  };

  const handleToggleAction = (stmtIndex: number, action: string) => {
    const updated = [...statements];
    const currentActions = updated[stmtIndex].Action;
    if (currentActions.includes(action)) {
      updated[stmtIndex].Action = currentActions.filter(a => a !== action);
    } else {
      updated[stmtIndex].Action = [...currentActions, action];
    }
    setStatements(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!name.trim()) {
      setError('Policy name is required.');
      setLoading(false);
      return;
    }

    if (type === 'INLINE' && view === 'create') {
      if (attachToType === 'user' && !targetUserId) {
        setError('Please select a target user for the inline policy.');
        setLoading(false);
        return;
      }
      if (attachToType === 'group' && !targetGroupId) {
        setError('Please select a target group for the inline policy.');
        setLoading(false);
        return;
      }
    }

    const invalidStmt = statements.some(s => s.Action.length === 0);
    if (invalidStmt) {
      setError('Each policy statement must include at least one Action.');
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        type,
        statements
      };

      if (type === 'INLINE' && view === 'create') {
        if (attachToType === 'user') {
          payload.userId = targetUserId;
        } else {
          payload.groupId = targetGroupId;
        }
      }

      if (view === 'create') {
        await api.post('/iam/policies', payload);
      } else {
        await api.put(`/iam/policies/${selectedPolicy!.id}`, {
          name: name.trim(),
          description: description.trim(),
          statements
        });
      }
      
      setView('list');
      fetchPolicies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save policy.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setLoading(true);
    try {
      await api.delete(`/iam/policies/${selectedPolicy!.id}`);
      setShowDeleteConfirm(false);
      setView('list');
      fetchPolicies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete policy.');
    } finally {
      setLoading(false);
    }
  };

  // Compute live JSON Preview
  const getJsonPreview = () => {
    return JSON.stringify({ statements }, null, 2);
  };

  const filteredPolicies = policies.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar />

      <div className="flex-1 overflow-y-auto p-8 relative flex flex-col">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px] -z-10" />

        <PageWrapper className="flex-1 flex flex-col min-h-0">
          {/* Error alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-3 text-sm shrink-0 overflow-hidden"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">Operation Error:</span> {error}
                </div>
                <button onClick={() => setError('')} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LIST VIEW */}
          {view === 'list' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Access Policies</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Manage standalone reusable (MANAGED) or inline (INLINE) policies defining route privileges.
                  </p>
                </div>
                <Button onClick={handleCreateOpen} className="gap-2 self-start sm:self-auto">
                  <Plus className="h-4 w-4" />
                  Create Policy
                </Button>
              </div>

              {/* Search */}
              <div className="relative mb-5 shrink-0 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search policies by name or description..."
                  className="pl-10"
                />
              </div>

              {/* Table */}
              <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="pl-6">Policy Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Statements</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="pr-6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(loading || isPoliciesLoading) && policies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                            Fetching policies from database...
                          </TableCell>
                        </TableRow>
                      ) : filteredPolicies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                            No policies found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPolicies.map((p) => {
                          const stmtCount = p.statements?.statements?.length || 0;
                          return (
                            <TableRow key={p.id} className="group">
                              <TableCell className="pl-6">
                                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {p.name}
                                </div>
                                {p.description && (
                                  <div className="text-xs text-muted-foreground mt-1 max-w-sm truncate">
                                    {p.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={p.type === 'MANAGED' ? 'info' : 'warning'}>
                                  {p.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium text-foreground/80">
                                {stmtCount} {stmtCount === 1 ? 'statement' : 'statements'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => fetchPolicyDetails(p.id)}
                                    className="h-8 w-8"
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditOpen(p)}
                                    className="h-8 w-8"
                                    title="Edit Policy"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}

          {/* DETAIL VIEW */}
          {view === 'detail' && selectedPolicy && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6 shrink-0">
                <Button variant="outline" size="icon" onClick={() => setView('list')} className="h-9 w-9">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-foreground">{selectedPolicy.name}</h1>
                    <Badge variant={selectedPolicy.type === 'MANAGED' ? 'info' : 'warning'}>
                      {selectedPolicy.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{selectedPolicy.description || 'No description provided'}</p>
                </div>
              </div>

              {/* Split Details */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Policy JSON */}
                <Card className="lg:col-span-2 flex flex-col min-h-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Policy Document JSON
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditOpen(selectedPolicy)} className="gap-1.5 h-7 text-xs">
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10">
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0">
                    <div className="h-full overflow-auto bg-background border border-border/50 rounded-xl p-4 font-mono text-xs text-emerald-400 select-all">
                      <pre>{JSON.stringify(selectedPolicy.statements, null, 2)}</pre>
                    </div>
                  </CardContent>
                </Card>

                {/* Attachments */}
                <Card className="flex flex-col min-h-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Policy Attachments</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto space-y-5">
                    {/* Users */}
                    <div>
                      <Label className="mb-2 block">Attached to Users</Label>
                      {((selectedPolicy as any).users && (selectedPolicy as any).users.length > 0) ? (
                        <div className="space-y-1.5">
                          {(selectedPolicy as any).users.map((u: any) => (
                            <div key={u.user.id} className="p-2.5 bg-background border border-border/50 rounded-lg text-xs font-medium">
                              {u.user.name} ({u.user.email})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Not attached to any users.</p>
                      )}
                    </div>

                    {/* Groups */}
                    <div>
                      <Label className="mb-2 block">Attached to Groups</Label>
                      {((selectedPolicy as any).groups && (selectedPolicy as any).groups.length > 0) ? (
                        <div className="space-y-1.5">
                          {(selectedPolicy as any).groups.map((g: any) => (
                            <div key={g.group.id} className="p-2.5 bg-background border border-border/50 rounded-lg text-xs font-medium">
                              {g.group.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Not attached to any groups.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Delete Confirmation Modal */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                  >
                    <motion.div
                      variants={scaleIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
                    >
                      <h3 className="text-lg font-bold text-foreground mb-2">Delete Access Policy</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Are you sure you want to delete policy <span className="text-foreground font-semibold">{selectedPolicy.name}</span>? This action is permanent and will detach it from all groups or users.
                      </p>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                          {loading ? 'Deleting...' : 'Delete Policy'}
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* CREATE / EDIT VIEW (POLICY BUILDER) */}
          {(view === 'create' || view === 'edit') && (
            <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setView(view === 'create' ? 'list' : 'detail')}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="text-xl font-bold text-foreground">
                    {view === 'create' ? 'Create New Policy' : `Edit Policy: ${selectedPolicy?.name}`}
                  </h1>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Policy'}
                </Button>
              </div>

              {/* Split Content */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Form Input fields and Statement Builder (col-span-3) */}
                <Card className="lg:col-span-3 flex flex-col min-h-0">
                  <CardContent className="p-6 flex-1 flex flex-col min-h-0">
                    {/* Meta details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 shrink-0">
                      <div className="space-y-1.5">
                        <Label>Policy Name</Label>
                        <Input
                          required
                          disabled={view === 'edit'}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. FinanceReportsAccess"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Policy Type</Label>
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          disabled={view === 'edit'}
                          className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                        >
                          <option value="MANAGED">MANAGED (Reusable)</option>
                          <option value="INLINE">INLINE (Coupled to single identity)</option>
                        </select>
                      </div>
                      {type === 'INLINE' && view === 'create' && (
                        <>
                          <div className="space-y-1.5">
                            <Label>Attach To Type</Label>
                            <select
                              value={attachToType}
                              onChange={(e) => setAttachToType(e.target.value as 'user' | 'group')}
                              className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all"
                            >
                              <option value="user">User</option>
                              <option value="group">Group</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>{attachToType === 'user' ? 'Select Target User' : 'Select Target Group'}</Label>
                            <select
                              value={attachToType === 'user' ? targetUserId : targetGroupId}
                              onChange={(e) => {
                                if (attachToType === 'user') {
                                  setTargetUserId(e.target.value);
                                } else {
                                  setTargetGroupId(e.target.value);
                                }
                              }}
                              className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all"
                            >
                              <option value="">-- Choose target --</option>
                              {attachToType === 'user'
                                ? usersList.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                  ))
                                : groupsList.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                  ))
                              }
                            </select>
                          </div>
                        </>
                      )}
                      <div className="md:col-span-2 space-y-1.5">
                        <Label>Description</Label>
                        <Input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Allows access to specific business units..."
                        />
                      </div>
                    </div>

                    <Separator className="mb-4 shrink-0" />

                    {/* Statements header */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <h3 className="text-sm font-bold text-foreground">Policy Statements</h3>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddStatement} className="gap-1.5 h-7 text-xs">
                        <Plus className="h-3 w-3" />
                        Add Statement
                      </Button>
                    </div>

                    {/* Scrollable statements */}
                    <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                      {statements.map((stmt, stmtIndex) => (
                        <motion.div
                          key={stmtIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative p-5 bg-background/60 border border-border/50 rounded-xl space-y-4"
                        >
                          {/* Delete statement button */}
                          {statements.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveStatement(stmtIndex)}
                              className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Badge variant="secondary" className="text-[9px]">
                            Statement #{stmtIndex + 1}
                          </Badge>

                          <div className="pt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Effect Toggle */}
                            <div className="space-y-1.5">
                              <Label>Effect</Label>
                              <div className="flex bg-muted/50 border border-border/50 p-0.5 rounded-lg max-w-[200px]">
                                <button
                                  type="button"
                                  onClick={() => handleStatementChange(stmtIndex, 'Effect', 'Allow')}
                                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md cursor-pointer transition-all ${
                                    stmt.Effect === 'Allow'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                                      : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  Allow
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatementChange(stmtIndex, 'Effect', 'Deny')}
                                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md cursor-pointer transition-all ${
                                    stmt.Effect === 'Deny'
                                      ? 'bg-destructive/10 text-destructive border border-destructive/20 shadow-sm'
                                      : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  Deny
                                </button>
                              </div>
                            </div>

                            {/* Resource Locked */}
                            <div className="space-y-1.5">
                              <Label>Resource</Label>
                              <Input
                                disabled
                                value='["*"]'
                                className="max-w-[200px] opacity-40 cursor-not-allowed font-mono text-xs"
                              />
                            </div>

                            {/* Action Multi-select */}
                            <div className="md:col-span-2 space-y-1.5">
                              <Label>Actions</Label>
                              
                              {/* Selected Actions badges */}
                              <div className="flex flex-wrap gap-1.5 p-2.5 bg-muted/30 border border-border/50 rounded-lg min-h-[42px]">
                                {stmt.Action.length === 0 ? (
                                  <span className="text-xs text-muted-foreground p-1 italic">No actions selected. Choose from dropdown below.</span>
                                ) : (
                                  stmt.Action.map(act => (
                                    <Badge key={act} variant="default" className="text-[10px] gap-1 pr-1">
                                      <span>{act}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAction(stmtIndex, act)}
                                        className="hover:text-foreground font-bold text-xs ml-0.5"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))
                                )}
                              </div>

                              {/* Toggle Dropdown */}
                              <div className="relative">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setActionSearch('');
                                    setActiveDropdownIndex(activeDropdownIndex === stmtIndex ? null : stmtIndex);
                                  }}
                                  className="w-full justify-between h-9 text-xs"
                                >
                                  <span>Manage Policy Actions</span>
                                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>

                                {/* Dropdown */}
                                <AnimatePresence>
                                  {activeDropdownIndex === stmtIndex && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -4 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute left-0 right-0 mt-2 p-3 bg-card border border-border rounded-xl shadow-2xl z-20 flex flex-col max-h-[300px]"
                                    >
                                      <Input
                                        value={actionSearch}
                                        onChange={(e) => setActionSearch(e.target.value)}
                                        placeholder="Filter action strings..."
                                        className="mb-2 h-8 text-xs"
                                      />
                                      <div className="flex-1 overflow-y-auto space-y-0.5">
                                        {VALID_ACTIONS.filter(act => act.toLowerCase().includes(actionSearch.toLowerCase())).map(act => {
                                          const isChecked = stmt.Action.includes(act);
                                          return (
                                            <label
                                              key={act}
                                              className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-muted/50 rounded-lg cursor-pointer text-xs transition-colors"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleAction(stmtIndex, act)}
                                                className="rounded border-border text-primary focus:ring-0 focus:ring-offset-0 bg-background"
                                              />
                                              <span className={`font-mono ${isChecked ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                                {act}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* JSON Live Preview (col-span-2) */}
                <Card className="lg:col-span-2 flex flex-col min-h-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Real-Time JSON Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0">
                    <div className="h-full overflow-auto bg-background border border-border/50 rounded-xl p-4 font-mono text-[11px] text-emerald-400 select-all">
                      <pre>{getJsonPreview()}</pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </form>
          )}
        </PageWrapper>
      </div>
    </div>
  );
};

export default Policies;
