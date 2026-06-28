import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Plus, Trash2, Edit3, Eye, ChevronLeft, AlertCircle, Search, X, UserPlus, UserMinus, ShieldAlert } from 'lucide-react';
import { Group, User, Policy } from '../types/iam';

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
    }
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
      setError(err.response?.data?.message || 'Failed to create group.');
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

  const currentPolicyIds = selectedGroup?.policies?.map((p: any) => p.policy.id) || [];
  const attachablePolicies = allPolicies.filter(p =>
    !currentPolicyIds.includes(p.id) &&
    p.name.toLowerCase().includes(policySearchText.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      <Sidebar />

      <div className="flex-1 overflow-y-auto bg-slate-950 p-8 relative flex flex-col">
        {/* Glow */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl -z-10"></div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-start space-x-3 text-sm shrink-0">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Operation Error:</span> {error}
            </div>
            <button onClick={() => setError('')} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">User Groups</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Organize user access by clustering members and binding reusable managed policies.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
              >
                <Plus className="h-4 w-4" />
                <span>Create Group</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-6 shrink-0 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups by name or description..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            {/* Groups Table */}
            <div className="flex-1 min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Group Name</th>
                      <th className="p-4">Members count</th>
                      <th className="p-4">Attached policies</th>
                      <th className="p-4">Created At</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {(loading || isGroupsLoading) && groups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          Fetching groups from database...
                        </td>
                      </tr>
                    ) : filteredGroups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No groups found.
                        </td>
                      </tr>
                    ) : (
                      filteredGroups.map((g) => {
                        const mCount = g.memberCount || 0;
                        const pCount = g.policyCount || 0;
                        return (
                          <tr key={g.id} className="hover:bg-slate-900/30 group">
                            <td className="p-4 pl-6">
                              <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                {g.name}
                              </div>
                              {g.description && (
                                <div className="text-xs text-slate-500 mt-1 max-w-sm truncate">
                                  {g.description}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-sm font-semibold text-slate-300">
                              {mCount} {mCount === 1 ? 'member' : 'members'}
                            </td>
                            <td className="p-4 text-sm font-semibold text-slate-300">
                              {pCount} {pCount === 1 ? 'policy' : 'policies'}
                            </td>
                            <td className="p-4 text-xs text-slate-500">
                              {new Date(g.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => fetchGroupDetails(g.id)}
                                className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="text-xs px-1">Manage</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create Group Modal */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <form onSubmit={handleCreateGroup} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white">Create User Group</h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Group Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Administrators"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Administrative personnel holding global systems view access..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm resize-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-sm font-semibold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl cursor-pointer shadow-md"
                    >
                      {loading ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* DETAIL VIEW */}
        {view === 'detail' && selectedGroup && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Detail Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 shrink-0">
              <div className="flex items-start space-x-3">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer mt-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {isEditingMeta ? (
                  <div className="space-y-2 max-w-md">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-2xl font-bold bg-slate-950 border border-slate-800 rounded-xl py-1 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="text-xs bg-slate-950 border border-slate-800 rounded-xl py-1 px-3 text-slate-400 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                      <span>{selectedGroup.name}</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">{selectedGroup.description || 'No description provided.'}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                {isEditingMeta ? (
                  <>
                    <button
                      onClick={() => setIsEditingMeta(false)}
                      className="px-3.5 py-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateGroupMeta}
                      disabled={loading}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditingMeta(true)}
                      className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer"
                      title="Edit metadata"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/50 text-rose-400 rounded-xl cursor-pointer"
                      title="Delete Group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Split layout: left column is Members, right column is Policies */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Group Members (Left Column) */}
              <div className="flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Group Members</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950 text-slate-500 border border-slate-850">
                      {selectedGroup.members?.length || 0}
                    </span>
                  </h3>
                  
                  {/* Add User Dropdown trigger */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setUserSearchText('');
                        setShowAddUserDropdown(!showAddUserDropdown);
                        setShowAttachPolicyDropdown(false);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-lg text-indigo-400 cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Add Member</span>
                    </button>

                    {showAddUserDropdown && (
                      <div className="absolute right-0 mt-2 p-3 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl z-20 w-72 flex flex-col max-h-[250px]">
                        <input
                          type="text"
                          value={userSearchText}
                          onChange={(e) => setUserSearchText(e.target.value)}
                          placeholder="Search users..."
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-600 focus:outline-none mb-2"
                        />
                        <div className="flex-1 overflow-y-auto space-y-1">
                          {addableUsers.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-2 text-center">No addable users found.</p>
                          ) : (
                            addableUsers.map(u => (
                              <button
                                key={u.id}
                                onClick={() => handleAddUser(u.id)}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-slate-950 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                              >
                                {u.name} ({u.email})
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {!selectedGroup.members || selectedGroup.members.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                      No members attached to this group.
                    </div>
                  ) : (
                    selectedGroup.members.map((u: any) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-2xl transition-all"
                      >
                        <div className="overflow-hidden pr-2">
                          <div className="font-semibold text-xs text-slate-200 truncate">{u.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{u.email}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveUser(u.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Remove member"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Group Policies (Right Column) */}
              <div className="flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Attached Policies</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950 text-slate-500 border border-slate-850">
                      {selectedGroup.policies?.length || 0}
                    </span>
                  </h3>

                  {/* Attach Policy dropdown trigger */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setPolicySearchText('');
                        setShowAttachPolicyDropdown(!showAttachPolicyDropdown);
                        setShowAddUserDropdown(false);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-lg text-indigo-400 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Attach Policy</span>
                    </button>

                    {showAttachPolicyDropdown && (
                      <div className="absolute right-0 mt-2 p-3 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl z-20 w-72 flex flex-col max-h-[250px]">
                        <input
                          type="text"
                          value={policySearchText}
                          onChange={(e) => setPolicySearchText(e.target.value)}
                          placeholder="Search policies..."
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-600 focus:outline-none mb-2"
                        />
                        <div className="flex-1 overflow-y-auto space-y-1">
                          {attachablePolicies.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-2 text-center">No managed policies found.</p>
                          ) : (
                            attachablePolicies.map(p => (
                              <button
                                key={p.id}
                                onClick={() => handleAttachPolicy(p.id)}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-slate-950 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                              >
                                {p.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {!selectedGroup.policies || selectedGroup.policies.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                      No policies attached to this group.
                    </div>
                  ) : (
                    selectedGroup.policies.map((p: any) => (
                      <div
                        key={p.policy.id}
                        className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-2xl transition-all"
                      >
                        <div className="overflow-hidden pr-2">
                          <div className="font-semibold text-xs text-slate-200 truncate">{p.policy.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{p.policy.description || 'No description.'}</div>
                        </div>
                        <button
                          onClick={() => handleDetachPolicy(p.policy.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Detach policy"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Delete group confirm dialog */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                    <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                    <span>Delete User Group</span>
                  </h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Are you sure you want to delete group <span className="text-white font-semibold">{selectedGroup.name}</span>? All group memberships will be severed immediately.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-sm font-semibold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteGroup}
                      disabled={loading}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl cursor-pointer shadow-md"
                    >
                      {loading ? 'Deleting...' : 'Delete Group'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
