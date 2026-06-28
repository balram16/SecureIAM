import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { ChevronLeft, ChevronDown, ChevronUp, AlertCircle, Search, X, Check, Eye, Plus, ShieldCheck, Shield, Trash2, Key, Users as UsersIcon } from 'lucide-react';
import { User, Policy } from '../types/iam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageWrapper } from '@/components/ui/motion';
import { useAuth } from '../context/AuthContext';

const ACTIONS_BY_NAMESPACE: Record<string, string[]> = {
  Reports: ['reports:List', 'reports:Read', 'reports:Create', 'reports:Update', 'reports:Delete'],
  Alerts: ['alerts:List', 'alerts:Read', 'alerts:Create', 'alerts:Acknowledge', 'alerts:Delete'],
  Settings: ['settings:Read', 'settings:Update'],
  Audit: ['audit:List', 'audit:Read'],
  IAM: [
    'iam:ListPolicies', 'iam:GetPolicy', 'iam:CreatePolicy', 'iam:UpdatePolicy', 'iam:DeletePolicy',
    'iam:ListGroups', 'iam:GetGroup', 'iam:CreateGroup', 'iam:UpdateGroup', 'iam:DeleteGroup',
    'iam:AddUserToGroup', 'iam:RemoveUserFromGroup', 'iam:AttachGroupPolicy', 'iam:DetachGroupPolicy',
    'iam:ListUsers', 'iam:GetUser', 'iam:AttachUserPolicy', 'iam:DetachUserPolicy',
    'iam:PutUserBoundary', 'iam:DeleteUserBoundary'
  ]
};

const Users = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Authenticated user state
  const { user: currentUser } = useAuth();

  // managed policies for attach / boundary options
  const [allPolicies, setAllPolicies] = useState<Policy[]>([]);

  // Accordion state for groups: { groupId: true/false }
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Dropdown states
  const [showAttachPolicyDropdown, setShowAttachPolicyDropdown] = useState(false);
  const [showBoundaryDropdown, setShowBoundaryDropdown] = useState(false);
  const [policySearchText, setPolicySearchText] = useState('');
  const [boundarySearchText, setBoundarySearchText] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // TanStack Query for users list
  const { data: users = [], isLoading: isUsersLoading, error: queryError } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/iam/users');
      return res.data.data;
    }
  });

  useEffect(() => {
    if (queryError) {
      setError((queryError as any).response?.data?.message || 'Failed to fetch users. Verify your access rights.');
    }
  }, [queryError]);

  const fetchUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const fetchUserDetails = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/iam/users/${id}`);
      setSelectedUser(res.data.data);
      setExpandedGroups({});
      setView('detail');

      // Pre-fetch managed policies for attach / boundary
      fetchAvailablePolicies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch user profile details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePolicies = async () => {
    try {
      const res = await api.get('/iam/policies');
      // Only managed policies can be attached or used as boundaries
      setAllPolicies(res.data.data.filter((p: Policy) => p.type === 'MANAGED'));
    } catch (err) {
      console.error('Failed to load policies', err);
    }
  };

  const handleAttachPolicy = async (policyId: string) => {
    setError('');
    try {
      await api.post(`/iam/users/${selectedUser.id}/policies`, { policyId });
      setShowAttachPolicyDropdown(false);
      setPolicySearchText('');
      fetchUserDetails(selectedUser.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to attach policy directly.');
    }
  };

  const handleDetachPolicy = async (policyId: string) => {
    setError('');
    try {
      await api.delete(`/iam/users/${selectedUser.id}/policies/${policyId}`);
      fetchUserDetails(selectedUser.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to detach policy.');
    }
  };

  const handleSetBoundary = async (policyId: string) => {
    setError('');
    try {
      await api.put(`/iam/users/${selectedUser.id}/boundary`, { policyId });
      setShowBoundaryDropdown(false);
      setBoundarySearchText('');
      fetchUserDetails(selectedUser.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set permission boundary.');
    }
  };

  const handleRemoveBoundary = async () => {
    setError('');
    try {
      await api.delete(`/iam/users/${selectedUser.id}/boundary`);
      fetchUserDetails(selectedUser.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove permission boundary.');
    }
  };

  const toggleGroupAccordion = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dropdown options filters
  const currentDirectPolicyIds = selectedUser?.directPolicies?.map((p: any) => p.id) || [];
  const attachablePolicies = allPolicies.filter(p =>
    !currentDirectPolicyIds.includes(p.id) &&
    p.name.toLowerCase().includes(policySearchText.toLowerCase())
  );

  const filterBoundaryPolicies = allPolicies.filter(p =>
    p.name.toLowerCase().includes(boundarySearchText.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar />

      <div className="flex-1 overflow-y-auto p-8 relative flex flex-col">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />

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
                  <span className="font-semibold">Security Alert:</span> {error}
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
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Organization Users</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Inspect user accounts, manage their direct policies, boundaries, and view calculated effective permissions.
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-5 shrink-0 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="pl-10"
                />
              </div>

              {/* Users Table */}
              <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="pl-6">User details</TableHead>
                        <TableHead>Direct policies</TableHead>
                        <TableHead>Groups membership</TableHead>
                        <TableHead>Permission boundary</TableHead>
                        <TableHead className="pr-6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(loading || isUsersLoading) && users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                            Fetching users list...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                            No users matching search query.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u) => {
                          const directCount = u.directPolicyCount || 0;
                          const groupCount = u.groupCount || 0;
                          return (
                            <TableRow key={u.id} className="group">
                              <TableCell className="pl-6">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {u.name}
                                  </span>
                                  {u.isRoot && (
                                    <Badge variant="destructive" className="text-[9px]">Root</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 select-all">{u.email}</div>
                              </TableCell>
                              <TableCell className="text-sm font-medium text-foreground/80">
                                {directCount} {directCount === 1 ? 'policy' : 'policies'}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-foreground/80">
                                {groupCount} {groupCount === 1 ? 'group' : 'groups'}
                              </TableCell>
                              <TableCell>
                                {u.boundary === 'yes' ? (
                                  <Badge variant="default" className="text-[9px] gap-1">
                                    <ShieldCheck className="h-3 w-3" />
                                    Enforced
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => fetchUserDetails(u.id)}
                                  className="gap-1.5 h-8 text-xs"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Details
                                </Button>
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
          {view === 'detail' && selectedUser && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6 shrink-0">
                <Button variant="outline" size="icon" onClick={() => setView('list')} className="h-9 w-9">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground">{selectedUser.name}</h1>
                    {selectedUser.isRoot && (
                      <Badge variant="destructive" className="text-[9px]">Root</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{selectedUser.email}</p>
                </div>
              </div>

              {/* Content columns */}
              <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-5">
                
                {/* LEFT & CENTER: POLICIES, BOUNDARIES AND EFFECTIVE GRID (2 cols) */}
                <div className="xl:col-span-2 flex flex-col min-h-0 space-y-5">
                  
                  {/* Upper: Policies and Boundary */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 shrink-0">
                    
                    {/* Direct Policies */}
                    <Card className="flex flex-col relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Key className="h-4 w-4 text-primary" />
                            Direct Policies
                          </CardTitle>

                          <div className="relative">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPolicySearchText('');
                                setShowAttachPolicyDropdown(!showAttachPolicyDropdown);
                                setShowBoundaryDropdown(false);
                              }}
                              className="gap-1 h-7 text-xs"
                            >
                              <Plus className="h-3 w-3" />
                              Attach
                            </Button>

                            <AnimatePresence>
                              {showAttachPolicyDropdown && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  className="absolute right-0 mt-2 p-3 bg-card border border-border rounded-xl shadow-2xl z-20 w-72 flex flex-col max-h-[200px]"
                                >
                                  <Input
                                    value={policySearchText}
                                    onChange={(e) => setPolicySearchText(e.target.value)}
                                    placeholder="Search managed policies..."
                                    className="mb-2 h-8 text-xs"
                                  />
                                  <div className="flex-1 overflow-y-auto space-y-0.5">
                                    {attachablePolicies.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic p-2 text-center">No attachable policies.</p>
                                    ) : (
                                      attachablePolicies.map(p => (
                                        <button
                                          key={p.id}
                                          onClick={() => handleAttachPolicy(p.id)}
                                          className="w-full text-left px-2 py-1.5 hover:bg-muted/50 rounded-lg text-xs text-foreground/80 hover:text-foreground transition-colors"
                                        >
                                          {p.name}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1">
                        {!selectedUser.directPolicies || selectedUser.directPolicies.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic p-2">No direct policy attachments.</p>
                        ) : (
                          selectedUser.directPolicies.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-2.5 bg-background/60 border border-border/50 rounded-lg text-xs">
                              <span className="font-medium text-foreground/80">{p.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDetachPolicy(p.id)}
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                title="Detach policy"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {/* Permission Boundary */}
                    <Card className="flex flex-col relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            Permission Boundary
                          </CardTitle>

                          {currentUser?.isRoot && (
                            <div className="relative">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBoundarySearchText('');
                                  setShowBoundaryDropdown(!showBoundaryDropdown);
                                  setShowAttachPolicyDropdown(false);
                                }}
                                className="h-7 text-xs"
                              >
                                Set Boundary
                              </Button>

                              <AnimatePresence>
                                {showBoundaryDropdown && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="absolute right-0 mt-2 p-3 bg-card border border-border rounded-xl shadow-2xl z-20 w-72 flex flex-col max-h-[200px]"
                                  >
                                    <Input
                                      value={boundarySearchText}
                                      onChange={(e) => setBoundarySearchText(e.target.value)}
                                      placeholder="Search boundary policies..."
                                      className="mb-2 h-8 text-xs"
                                    />
                                    <div className="flex-1 overflow-y-auto space-y-0.5">
                                      {filterBoundaryPolicies.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic p-2 text-center">No policies found.</p>
                                      ) : (
                                        filterBoundaryPolicies.map(p => (
                                          <button
                                            key={p.id}
                                            onClick={() => handleSetBoundary(p.id)}
                                            className="w-full text-left px-2 py-1.5 hover:bg-muted/50 rounded-lg text-xs text-foreground/80 hover:text-foreground transition-colors"
                                          >
                                            {p.name}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col justify-center">
                        {selectedUser.boundary ? (
                          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-primary flex items-center gap-1">
                                  <ShieldCheck className="h-4 w-4 shrink-0" />
                                  <span>Boundary Enforced:</span>
                                </div>
                                <div className="text-foreground/80 font-semibold mt-1 font-mono">{selectedUser.boundary.name}</div>
                              </div>
                              {currentUser?.isRoot && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleRemoveBoundary}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  title="Remove boundary"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-normal">
                              This boundary restricts the maximum permission depth allowed for the user, overriding any Allow statements.
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                            No permission boundary set. User can execute all actions granted by direct or group policies.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Lower: Effective Permissions Matrix */}
                  <Card className="flex-1 min-h-0 flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Calculated Effective Permissions Matrix
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto space-y-4 pr-1">
                      {Object.keys(ACTIONS_BY_NAMESPACE).map(namespace => {
                        const nsActions = ACTIONS_BY_NAMESPACE[namespace];
                        return (
                          <motion.div
                            key={namespace}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-background/60 border border-border/50 rounded-xl space-y-3"
                          >
                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{namespace} Actions</h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {nsActions.map(action => {
                                const calculated = selectedUser.effectivePermissions?.[action] || { allowed: false, source: 'None' };
                                const isAllowed = calculated.allowed;
                                return (
                                  <div
                                    key={action}
                                    className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                                      isAllowed
                                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                        : 'bg-background/40 border-border/40 text-muted-foreground'
                                    }`}
                                  >
                                    <span className="font-mono text-[10px] truncate pr-1" title={action}>
                                      {action.split(':')[1] || action}
                                    </span>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isAllowed ? (
                                        <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                                      ) : (
                                        <X className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                                      )}
                                      <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                                        {calculated.source === 'BoundaryBlock' ? 'Blocked' : calculated.source}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* RIGHT COLUMN: GROUP MEMBERSHIPS */}
                <Card className="flex flex-col min-h-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UsersIcon className="h-4 w-4 text-primary" />
                      Group Memberships
                      <Badge variant="secondary" className="text-[9px]">{selectedUser.groups?.length || 0}</Badge>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {!selectedUser.groups || selectedUser.groups.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">
                        This user is not a member of any groups.
                      </div>
                    ) : (
                      selectedUser.groups.map((g: any) => {
                        const isExpanded = expandedGroups[g.id] || false;
                        return (
                          <div key={g.id} className="bg-background/60 border border-border/50 rounded-xl overflow-hidden">
                            {/* Accordion trigger */}
                            <button
                              onClick={() => toggleGroupAccordion(g.id)}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted/30 text-left transition-colors cursor-pointer"
                            >
                              <div className="overflow-hidden pr-2">
                                <span className="text-xs font-bold text-foreground block truncate">{g.name}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                                  {g.policies?.length || 0} Attached {g.policies?.length === 1 ? 'policy' : 'policies'}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                            </button>

                            {/* Expansion panel */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-3 bg-background border-t border-border/40 space-y-2">
                                    <h5 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Group Policies</h5>
                                    {g.policies && g.policies.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {g.policies.map((p: any) => (
                                          <div key={p.id} className="p-2 bg-muted/20 border border-border/40 rounded-lg text-[11px] font-medium text-muted-foreground">
                                            {p.name}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground/60 italic">No policies attached to group.</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </PageWrapper>
      </div>
    </div>
  );
};

export default Users;
