import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Plus, Trash2, Edit3, Eye, FileText, ChevronLeft, AlertCircle, Search, X, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
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
  'iam:ListUsers', 'iam:GetUser', 'iam:AttachUserPolicy', 'iam:DetachUserPolicy', 'iam:PutUserBoundary',
  'iam:DeleteUserBoundary'
];

const ACTIONS_BY_GROUP: Record<string, string[]> = {
  "Reports Permissions": ['reports:List', 'reports:Read', 'reports:Create', 'reports:Update', 'reports:Delete'],
  "Alerts Permissions": ['alerts:List', 'alerts:Read', 'alerts:Create', 'alerts:Acknowledge', 'alerts:Delete'],
  "Settings & Auditing": ['settings:Read', 'settings:Update', 'audit:List', 'audit:Read'],
  "IAM Control Plane": [
    'iam:ListPolicies', 'iam:GetPolicy', 'iam:CreatePolicy', 'iam:UpdatePolicy', 'iam:DeletePolicy',
    'iam:ListGroups', 'iam:GetGroup', 'iam:CreateGroup', 'iam:UpdateGroup', 'iam:DeleteGroup',
    'iam:AddUserToGroup', 'iam:RemoveUserFromGroup', 'iam:AttachGroupPolicy', 'iam:DetachGroupPolicy',
    'iam:ListUsers', 'iam:GetUser', 'iam:AttachUserPolicy', 'iam:DetachUserPolicy', 'iam:PutUserBoundary',
    'iam:DeleteUserBoundary'
  ]
};

const CATEGORY_TABS = ['Reports', 'Alerts', 'Settings', 'Audit', 'IAM'] as const;
type Category = typeof CATEGORY_TABS[number];

const IAM_COLUMNS = [
  {
    groups: [
      {
        name: 'USERS',
        actions: ['iam:ListUsers', 'iam:GetUser']
      },
      {
        name: 'GROUPS',
        actions: ['iam:ListGroups', 'iam:GetGroup', 'iam:CreateGroup', 'iam:UpdateGroup', 'iam:DeleteGroup']
      }
    ]
  },
  {
    groups: [
      {
        name: 'POLICIES',
        actions: ['iam:ListPolicies', 'iam:GetPolicy', 'iam:CreatePolicy', 'iam:UpdatePolicy', 'iam:DeletePolicy']
      },
      {
        name: 'MEMBERSHIP',
        actions: ['iam:AddUserToGroup', 'iam:RemoveUserFromGroup']
      }
    ]
  },
  {
    groups: [
      {
        name: 'POLICY ATTACHMENTS',
        actions: ['iam:AttachUserPolicy', 'iam:DetachUserPolicy', 'iam:AttachGroupPolicy', 'iam:DetachGroupPolicy']
      },
      {
        name: 'PERMISSION BOUNDARIES',
        actions: ['iam:PutUserBoundary', 'iam:DeleteUserBoundary']
      }
    ]
  }
];

const NON_IAM_GROUPS: Record<Exclude<Category, 'IAM'>, { name: string; actions: string[] }[]> = {
  Reports: [
    {
      name: 'REPORTS PERMISSIONS',
      actions: ['reports:List', 'reports:Read', 'reports:Create', 'reports:Update', 'reports:Delete']
    }
  ],
  Alerts: [
    {
      name: 'ALERTS PERMISSIONS',
      actions: ['alerts:List', 'alerts:Read', 'alerts:Create', 'alerts:Acknowledge', 'alerts:Delete']
    }
  ],
  Settings: [
    {
      name: 'SETTINGS PERMISSIONS',
      actions: ['settings:Read', 'settings:Update']
    }
  ],
  Audit: [
    {
      name: 'AUDIT PERMISSIONS',
      actions: ['audit:List', 'audit:Read']
    }
  ]
};

const parseAttachmentError = (errorMsg: string) => {
  if (!errorMsg.includes('attached to')) return null;
  
  const usersMatch = errorMsg.match(/users:\s*\[([^\]]+)\]/i);
  const groupsMatch = errorMsg.match(/groups:\s*\[([^\]]+)\]/i);
  
  const users = usersMatch ? usersMatch[1].split(',').map(s => s.trim()) : [];
  const groups = groupsMatch ? groupsMatch[1].split(',').map(s => s.trim()) : [];
  
  if (users.length === 0 && groups.length === 0) {
    return null;
  }
  
  return { users, groups };
};

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
  const [activeCategory, setActiveCategory] = useState<Category>('Reports');

  const handleCustomActionsChange = (stmtIndex: number, val: string) => {
    const customActs = val.split(',').map(s => s.trim()).filter(Boolean);
    const standardActs = statements[stmtIndex].Action.filter(act => VALID_ACTIONS.includes(act));
    const newActions = [...standardActs, ...customActs];
    handleStatementChange(stmtIndex, 'Action', newActions);
  };

  // TanStack Query for server state
  const { data: policies = [], isLoading: isPoliciesLoading, error: queryError } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: async () => {
      const res = await api.get('/iam/policies');
      return res.data.data;
    },
    retry: false
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

  if (queryError && (queryError as any).response?.status === 403) {
    const message = (queryError as any).response?.data?.message || '';
    const missingPermission = message.match(/perform\s+([a-zA-Z0-9:]+)/)?.[1] || 'iam:ListPolicies';
    
    return (
      <div className="flex h-screen bg-background overflow-hidden text-foreground">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-8 relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-destructive/5 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-card border border-destructive/20 rounded-2xl shadow-2xl p-8 text-center space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-destructive via-red-500 to-destructive" />
            
            <div className="mx-auto w-16 h-16 bg-destructive/10 text-destructive border border-destructive/20 rounded-full flex items-center justify-center shadow-lg shadow-destructive/10 animate-pulse">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
                🛡️ Permission Denied
              </h2>
              <p className="text-[11px] font-bold text-destructive uppercase tracking-widest bg-destructive/5 py-1 px-3 rounded-full inline-block border border-destructive/10">
                403 Forbidden
              </p>
            </div>

            <div className="space-y-3 p-4 bg-background/50 border border-border/40 rounded-xl">
              <div className="text-xs text-muted-foreground font-medium">Missing Permission</div>
              <div className="font-mono text-sm text-foreground bg-muted/60 py-1.5 px-3 rounded-lg border border-border/50 select-all font-semibold inline-block">
                {missingPermission}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                You do not have the required permissions in your attached identity policies or groups to access this console page.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full text-xs font-semibold cursor-pointer border-border hover:bg-muted/50"
              onClick={() => window.location.href = '/dashboard'}
            >
              Return to Dashboard
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

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
                        <Button variant="outline" size="sm" onClick={() => { setError(''); setShowDeleteConfirm(true); }} className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10">
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0">
                    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-zinc-800 bg-[#1e1e1e] shadow-lg min-h-[300px]">
                      {/* VS Code Window Header Bar */}
                      <div className="flex items-center px-4 py-2.5 bg-[#181818] border-b border-zinc-800/80 select-none">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                        </div>
                      </div>
                      
                      {/* Editor Area */}
                      <div className="flex-1 overflow-auto p-4 font-mono text-xs text-emerald-400 select-all leading-relaxed bg-[#1e1e1e]">
                        <pre>{JSON.stringify(selectedPolicy.statements, null, 2)}</pre>
                      </div>
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
                      {(selectedPolicy.users && selectedPolicy.users.length > 0) ? (
                        <div className="space-y-1.5">
                          {selectedPolicy.users.map((u) => (
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
                      {(selectedPolicy.groups && selectedPolicy.groups.length > 0) ? (
                        <div className="space-y-1.5">
                          {selectedPolicy.groups.map((g) => (
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
                      className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
                    >
                      <h3 className="text-lg font-bold text-foreground">Delete Access Policy</h3>
                      
                      {error && (() => {
                         const attachments = parseAttachmentError(error);
                         if (attachments) {
                           return (
                             <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl space-y-3 text-xs">
                               <div className="flex items-center gap-2 font-bold text-sm">
                                 <AlertCircle className="h-4.5 w-4.5 text-destructive shrink-0" />
                                 <span>Policy In Use</span>
                               </div>
                               <p className="text-[11px] text-muted-foreground leading-normal">
                                 This managed policy is currently active and cannot be deleted until it is detached from:
                               </p>
                               
                               <div className="space-y-2 pt-1">
                                 {attachments.users.length > 0 && (
                                   <div className="flex flex-wrap items-center gap-1.5">
                                     <span className="font-semibold text-foreground/80 mr-1">Users:</span>
                                     {attachments.users.map(u => (
                                       <Badge key={u} variant="outline" className="bg-background border-destructive/25 text-destructive text-[10px] font-mono px-2 py-0.5">
                                         {u}
                                       </Badge>
                                     ))}
                                   </div>
                                 )}
                                 {attachments.groups.length > 0 && (
                                   <div className="flex flex-wrap items-center gap-1.5">
                                     <span className="font-semibold text-foreground/80 mr-1">Groups:</span>
                                     {attachments.groups.map(g => (
                                       <Badge key={g} variant="outline" className="bg-background border-destructive/25 text-destructive text-[10px] font-mono px-2 py-0.5">
                                         {g}
                                       </Badge>
                                     ))}
                                   </div>
                                 )}
                               </div>
                               
                               <p className="text-[10px] font-bold text-destructive/80 pt-1.5 border-t border-destructive/10">
                                 ➔ Detach the policy from these entities first and try again.
                               </p>
                             </div>
                           );
                         }
                         
                         return (
                           <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-2.5 text-xs">
                             <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                             <div className="flex-1">
                               <span className="font-semibold">Error:</span> {error}
                             </div>
                             <button type="button" onClick={() => setError('')} className="text-muted-foreground hover:text-foreground">
                               <X className="h-3.5 w-3.5" />
                             </button>
                           </div>
                         );
                       })()}

                      <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete policy <span className="text-foreground font-semibold">{selectedPolicy.name}</span>? This action is permanent and will detach it from all groups or users.
                      </p>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => { setError(''); setShowDeleteConfirm(false); }}>
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
                              {/* Toggle Dropdown */}
                              <div className="relative">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setActionSearch('');
                                    setActiveDropdownIndex(activeDropdownIndex === stmtIndex ? null : stmtIndex);
                                  }}
                                  className={`w-full justify-between h-10 px-3.5 text-xs bg-background border border-border/80 hover:bg-muted/10 hover:border-border transition-all rounded-lg ${
                                    activeDropdownIndex === stmtIndex ? 'ring-2 ring-primary/20 border-primary/45 bg-muted/5' : 'shadow-sm'
                                  }`}
                                >
                                  <span>Select action permissions...</span>
                                  {activeDropdownIndex === stmtIndex ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                 <AnimatePresence>
                                   {activeDropdownIndex === stmtIndex && (
                                     <motion.div
                                       initial={{ opacity: 0, y: -4 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       exit={{ opacity: 0, y: -4 }}
                                       className="absolute left-0 right-0 mt-2 p-4 bg-background border border-border/80 rounded-xl shadow-xl z-30 flex flex-col max-h-[380px] overflow-hidden"
                                     >
                                       {/* Tab Header */}
                                       <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 mb-3 shrink-0">
                                         <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50">
                                           {CATEGORY_TABS.map((cat) => (
                                             <button
                                               key={cat}
                                               type="button"
                                               onClick={() => setActiveCategory(cat)}
                                               className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                                 activeCategory === cat
                                                   ? 'bg-background text-primary shadow-sm border border-border/10'
                                                   : 'text-muted-foreground hover:text-foreground'
                                               }`}
                                             >
                                               {cat}
                                             </button>
                                           ))}
                                         </div>
                                       </div>

                                       {/* Action Checkboxes List */}
                                       <div className="flex-1 overflow-y-auto pr-1">
                                         {activeCategory === 'IAM' ? (
                                           <div className="grid grid-cols-3 gap-5">
                                             {IAM_COLUMNS.map((col, colIdx) => (
                                               <div key={colIdx} className="space-y-3.5">
                                                 {col.groups.map((group) => (
                                                   <div key={group.name} className="space-y-1">
                                                     <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest border-b border-border/20 pb-0.5 mb-1">
                                                       {group.name}
                                                     </div>
                                                     <div className="space-y-0.5">
                                                       {group.actions.map((act) => {
                                                         const isChecked = stmt.Action.includes(act);
                                                         const isRestricted = act === 'iam:PutUserBoundary' || act === 'iam:DeleteUserBoundary';
                                                         return (
                                                           <label
                                                             key={act}
                                                             title={isRestricted ? "Root only — cannot be delegated" : undefined}
                                                             className={`flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-primary/5 rounded-lg text-xs transition-all ${
                                                               isRestricted ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                                             } ${
                                                               isChecked ? 'bg-primary/5 text-primary font-medium' : 'text-foreground/80 hover:text-foreground'
                                                             }`}
                                                           >
                                                             <input
                                                               type="checkbox"
                                                               checked={isChecked}
                                                               disabled={isRestricted}
                                                               onChange={() => !isRestricted && handleToggleAction(stmtIndex, act)}
                                                               className="rounded border-border text-primary focus:ring-0 focus:ring-offset-0 bg-background h-3.5 w-3.5 disabled:opacity-50"
                                                             />
                                                             <span className="font-mono text-[11.5px] flex items-center justify-between w-full">
                                                               <span>{act}</span>
                                                               {isRestricted && (
                                                                 <span className="text-[8px] bg-rose-500/10 text-rose-500 font-semibold px-1 py-0.5 rounded tracking-wide shrink-0 font-sans ml-1">
                                                                   Root Only
                                                                 </span>
                                                               )}
                                                             </span>
                                                           </label>
                                                         );
                                                       })}
                                                     </div>
                                                   </div>
                                                 ))}
                                               </div>
                                             ))}
                                           </div>
                                         ) : (
                                           <div className="space-y-2">
                                             {NON_IAM_GROUPS[activeCategory as Exclude<Category, 'IAM'>].map((group) => (
                                               <div key={group.name} className="space-y-1.5">
                                                 <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest border-b border-border/20 pb-0.5 mb-1.5">
                                                   {group.name}
                                                 </div>
                                                 <div className="grid grid-cols-3 gap-2.5">
                                                   {group.actions.map((act) => {
                                                     const isChecked = stmt.Action.includes(act);
                                                     return (
                                                       <label
                                                         key={act}
                                                         className={`flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-primary/5 rounded-lg cursor-pointer text-xs transition-all ${
                                                           isChecked ? 'bg-primary/5 text-primary font-medium' : 'text-foreground/80 hover:text-foreground'
                                                         }`}
                                                       >
                                                         <input
                                                           type="checkbox"
                                                           checked={isChecked}
                                                           onChange={() => handleToggleAction(stmtIndex, act)}
                                                           className="rounded border-border text-primary focus:ring-0 focus:ring-offset-0 bg-background h-3.5 w-3.5"
                                                         />
                                                         <span className="font-mono text-[11.5px]">{act}</span>
                                                       </label>
                                                     );
                                                   })}
                                                 </div>
                                               </div>
                                             ))}
                                           </div>
                                         )}
                                       </div>

                                       <Button
                                         type="button"
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => setActiveDropdownIndex(null)}
                                         className="mt-3.5 h-8 text-[11px] font-semibold cursor-pointer hover:bg-muted/50 border border-border/40 shrink-0"
                                       >
                                         Close Selector Drawer
                                       </Button>
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
                    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-zinc-800 bg-[#1e1e1e] shadow-lg min-h-[300px]">
                      {/* VS Code Window Header Bar */}
                      <div className="flex items-center px-4 py-2.5 bg-[#181818] border-b border-zinc-800/80 select-none">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                        </div>
                      </div>
                      
                      {/* Editor Area */}
                      <div className="flex-1 overflow-auto p-4 font-mono text-[11px] text-emerald-400 select-all leading-relaxed bg-[#1e1e1e]">
                        <pre>{getJsonPreview()}</pre>
                      </div>
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
