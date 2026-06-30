import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Plus, Trash2, Edit3, Eye, ChevronLeft, AlertCircle, Search, X, UserPlus, UserMinus, ShieldAlert } from 'lucide-react';
import { Group, User, Policy } from '../types/iam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageWrapper, scaleIn } from '@/components/ui/motion';

const Groups = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // Listing data for selections
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allPolicies, setAllPolicies] = useState<Policy[]>([]);

  // Create Group Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Editing detail settings
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Dropdowns toggles
  const [showAddUserDropdown, setShowAddUserDropdown] = useState(false);
  const [showAttachPolicyDropdown, setShowAttachPolicyDropdown] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [policySearchText, setPolicySearchText] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // TanStack Query for groups
  const { data: groups = [], isLoading: isGroupsLoading, error: queryError } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/iam/groups');
      return res.data.data;
    },
    retry: false
  });

  useEffect(() => {
    if (queryError) {
      setError((queryError as any).response?.data?.message || 'Failed to fetch groups. Verify your access rights.');
    }
  }, [queryError]);

  const fetchGroups = async () => {
    await queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  const fetchGroupDetails = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/iam/groups/${id}`);
      setSelectedGroup(res.data.data);
      setEditName(res.data.data.name);
      setEditDescription(res.data.data.description || '');
      setIsEditingMeta(false);
      setView('detail');

      // Pre-fetch users and policies for addition dropdowns
      fetchAvailableUsers();
      fetchAvailablePolicies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch group details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await api.get('/iam/users');
      setAllUsers(res.data.data);
    } catch (err) {
      console.error('Failed to load user list', err);
    }
  };

  const fetchAvailablePolicies = async () => {
    try {
      const res = await api.get('/iam/policies');
      // Only managed policies can be attached
      setAllPolicies(res.data.data.filter((p: Policy) => p.type === 'MANAGED'));
    } catch (err) {
      console.error('Failed to load policy list', err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/iam/groups', { name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      setShowCreateModal(false);
      fetchGroups();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create group.';
      const status = err.response?.status ? ` (Status ${err.response.status})` : '';
      setError(`${msg}${status}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroupMeta = async () => {
    setError('');
    setLoading(true);
    try {
      await api.put(`/iam/groups/${selectedGroup.id}`, {
        name: editName.trim(),
        description: editDescription.trim()
      });
      setIsEditingMeta(false);
      fetchGroupDetails(selectedGroup.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update group metadata.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    setError('');
    setLoading(true);
    try {
      await api.delete(`/iam/groups/${selectedGroup.id}`);
      setShowDeleteConfirm(false);
      setView('list');
      fetchGroups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete group.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (userId: string) => {
    setError('');
    try {
      await api.post(`/iam/groups/${selectedGroup.id}/members`, { userId });
      setShowAddUserDropdown(false);
      setUserSearchText('');
      fetchGroupDetails(selectedGroup.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add user to group.');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    setError('');
    try {
      await api.delete(`/iam/groups/${selectedGroup.id}/members/${userId}`);
      fetchGroupDetails(selectedGroup.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove user from group.');
    }
  };

  const handleAttachPolicy = async (policyId: string) => {
    setError('');
    try {
      await api.post(`/iam/groups/${selectedGroup.id}/policies`, { policyId });
      setShowAttachPolicyDropdown(false);
      setPolicySearchText('');
      fetchGroupDetails(selectedGroup.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to attach policy to group.');
    }
  };

  const handleDetachPolicy = async (policyId: string) => {
    setError('');
    try {
      await api.delete(`/iam/groups/${selectedGroup.id}/policies/${policyId}`);
      fetchGroupDetails(selectedGroup.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to detach policy from group.');
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter lists for dropdown addition
  const currentMemberIds = selectedGroup?.members?.map((m: any) => m.id) || [];
  const addableUsers = allUsers.filter(u => 
    !currentMemberIds.includes(u.id) &&
    (u.name.toLowerCase().includes(userSearchText.toLowerCase()) || u.email.toLowerCase().includes(userSearchText.toLowerCase()))
  );

  const currentPolicyIds = selectedGroup?.policies?.map((p: any) => p.id) || [];
  const attachablePolicies = allPolicies.filter(p =>
    !currentPolicyIds.includes(p.id) &&
    p.name.toLowerCase().includes(policySearchText.toLowerCase())
  );

  if (queryError && (queryError as any).response?.status === 403) {
    const message = (queryError as any).response?.data?.message || '';
    const missingPermission = message.match(/perform\s+([a-zA-Z0-9:]+)/)?.[1] || 'iam:ListGroups';
    
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
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">User Groups</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Organize user access by clustering members and binding reusable managed policies.
                  </p>
                </div>
                 <Button onClick={() => { setError(''); setName(''); setDescription(''); setShowCreateModal(true); }} className="gap-2 self-start sm:self-auto">
                  <Plus className="h-4 w-4" />
                  Create Group
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
                  placeholder="Search groups by name or description..."
                  className="pl-10"
                />
              </div>

              {/* Groups Table */}
              <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="pl-6">Group Name</TableHead>
                        <TableHead>Members count</TableHead>
                        <TableHead>Attached policies</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="pr-6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(loading || isGroupsLoading) && groups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                            Fetching groups from database...
                          </TableCell>
                        </TableRow>
                      ) : filteredGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                            No groups found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredGroups.map((g) => {
                          const mCount = g.memberCount || 0;
                          const pCount = g.policyCount || 0;
                          return (
                            <TableRow key={g.id} className="group">
                              <TableCell className="pl-6">
                                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {g.name}
                                </div>
                                {g.description && (
                                  <div className="text-xs text-muted-foreground mt-1 max-w-sm truncate">
                                    {g.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-foreground/80">
                                {mCount} {mCount === 1 ? 'member' : 'members'}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-foreground/80">
                                {pCount} {pCount === 1 ? 'policy' : 'policies'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(g.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => fetchGroupDetails(g.id)}
                                  className="gap-1.5 h-8 text-xs"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Manage
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

              {/* Create Group Modal */}
              <AnimatePresence>
                {showCreateModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                  >
                    <motion.form
                      variants={scaleIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      onSubmit={handleCreateGroup}
                      className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
                    >
                      <h3 className="text-lg font-bold text-foreground">Create User Group</h3>
                      
                      {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-2.5 text-xs">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-semibold">Error:</span> {error}
                          </div>
                          <button type="button" onClick={() => setError('')} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      
                      <div className="space-y-1.5">
                        <Label>Group Name</Label>
                        <Input
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Administrators"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Administrative personnel holding global systems view access..."
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Creating...' : 'Create Group'}
                        </Button>
                      </div>
                    </motion.form>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* DETAIL VIEW */}
          {view === 'detail' && selectedGroup && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Detail Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 shrink-0">
                <div className="flex items-start gap-3">
                  <Button variant="outline" size="icon" onClick={() => setView('list')} className="h-9 w-9 mt-0.5">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {isEditingMeta ? (
                    <div className="space-y-2 max-w-md">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-lg font-bold"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-xl font-bold text-foreground">{selectedGroup.name}</h1>
                      <p className="text-xs text-muted-foreground mt-1">{selectedGroup.description || 'No description provided.'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {isEditingMeta ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsEditingMeta(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleUpdateGroupMeta} disabled={loading}>Save</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="icon" onClick={() => setIsEditingMeta(true)} className="h-9 w-9" title="Edit metadata">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setShowDeleteConfirm(true)} className="h-9 w-9 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10" title="Delete Group">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Split layout: Members + Policies */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Group Members */}
                <Card className="flex flex-col min-h-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        Group Members
                        <Badge variant="secondary" className="text-[9px]">{selectedGroup.members?.length || 0}</Badge>
                      </CardTitle>
                      
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserSearchText('');
                            setShowAddUserDropdown(!showAddUserDropdown);
                            setShowAttachPolicyDropdown(false);
                          }}
                          className="gap-1.5 h-7 text-xs"
                        >
                          <UserPlus className="h-3 w-3" />
                          Add Member
                        </Button>

                        <AnimatePresence>
                          {showAddUserDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute right-0 mt-2 p-3 bg-card border border-border rounded-xl shadow-2xl z-20 w-72 flex flex-col max-h-[250px]"
                            >
                              <Input
                                value={userSearchText}
                                onChange={(e) => setUserSearchText(e.target.value)}
                                placeholder="Search users..."
                                className="mb-2 h-8 text-xs"
                              />
                              <div className="flex-1 overflow-y-auto space-y-0.5">
                                {addableUsers.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic p-2 text-center">No addable users found.</p>
                                ) : (
                                  addableUsers.map(u => (
                                    <button
                                      key={u.id}
                                      onClick={() => handleAddUser(u.id)}
                                      className="w-full text-left px-2.5 py-1.5 hover:bg-muted/50 rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
                                    >
                                      {u.name} ({u.email})
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

                  <CardContent className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {!selectedGroup.members || selectedGroup.members.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">
                        No members attached to this group.
                      </div>
                    ) : (
                      selectedGroup.members.map((u: any) => (
                        <motion.div
                          key={u.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-background/60 border border-border/50 hover:border-border rounded-xl transition-all"
                        >
                          <div className="overflow-hidden pr-2">
                            <div className="font-medium text-xs text-foreground truncate">{u.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{u.email}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveUser(u.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Remove member"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Group Policies */}
                <Card className="flex flex-col min-h-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        Attached Policies
                        <Badge variant="secondary" className="text-[9px]">{selectedGroup.policies?.length || 0}</Badge>
                      </CardTitle>

                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPolicySearchText('');
                            setShowAttachPolicyDropdown(!showAttachPolicyDropdown);
                            setShowAddUserDropdown(false);
                          }}
                          className="gap-1.5 h-7 text-xs"
                        >
                          <Plus className="h-3 w-3" />
                          Attach Policy
                        </Button>

                        <AnimatePresence>
                          {showAttachPolicyDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute right-0 mt-2 p-3 bg-card border border-border rounded-xl shadow-2xl z-20 w-72 flex flex-col max-h-[250px]"
                            >
                              <Input
                                value={policySearchText}
                                onChange={(e) => setPolicySearchText(e.target.value)}
                                placeholder="Search policies..."
                                className="mb-2 h-8 text-xs"
                              />
                              <div className="flex-1 overflow-y-auto space-y-0.5">
                                {attachablePolicies.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic p-2 text-center">No managed policies found.</p>
                                ) : (
                                  attachablePolicies.map(p => (
                                    <button
                                      key={p.id}
                                      onClick={() => handleAttachPolicy(p.id)}
                                      className="w-full text-left px-2.5 py-1.5 hover:bg-muted/50 rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
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

                  <CardContent className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {!selectedGroup.policies || selectedGroup.policies.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">
                        No policies attached to this group.
                      </div>
                    ) : (
                      selectedGroup.policies.map((p: any) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-background/60 border border-border/50 hover:border-border rounded-xl transition-all"
                        >
                          <div className="overflow-hidden pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs text-foreground truncate">{p.name}</span>
                              <Badge variant={p.type === 'MANAGED' ? 'secondary' : 'outline'} className="text-[9px] px-1.5 py-0 shrink-0 font-semibold tracking-wider text-[10px]">
                                {p.type}
                              </Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.description || 'No description.'}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDetachPolicy(p.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Detach policy"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Delete group confirm */}
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
                      <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                        Delete User Group
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Are you sure you want to delete group <span className="text-foreground font-semibold">{selectedGroup.name}</span>? All group memberships will be severed immediately.
                      </p>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteGroup} disabled={loading}>
                          {loading ? 'Deleting...' : 'Delete Group'}
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </PageWrapper>
      </div>
    </div>
  );
};

export default Groups;
