import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { ChevronLeft, ChevronDown, ChevronUp, AlertCircle, Search, X, Check, Eye, Plus, ShieldCheck, ShieldAlert, Shield, Trash2, Key, Users as UsersIcon } from 'lucide-react';
import { User, Policy } from '../types/iam';

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
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

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
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      <Sidebar />

      <div className="flex-1 overflow-y-auto bg-slate-950 p-8 relative flex flex-col">
        {/* Glow */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl -z-10"></div>

        {/* Global error card */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-start space-x-3 text-sm shrink-0">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Security Alert:</span> {error}
            </div>
            <button onClick={() => setError('')} className="text-slate-400 hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Organization Users</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Inspect user accounts, manage their direct policies, boundaries, and view calculated effective permissions.
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6 shrink-0 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            {/* Users list table */}
            <div className="flex-1 min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">User details</th>
                      <th className="p-4">Direct policies</th>
                      <th className="p-4">Groups membership</th>
                      <th className="p-4">Permission boundary</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {(loading || isUsersLoading) && users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          Fetching users list...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No users matching search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const directCount = u.directPolicyCount || 0;
                        const groupCount = u.groupCount || 0;
                        return (
                          <tr key={u.id} className="hover:bg-slate-900/30 group">
                            <td className="p-4 pl-6">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                  {u.name}
                                </span>
                                {u.isRoot && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded uppercase">
                                    Root
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 select-all">{u.email}</div>
                            </td>
                            <td className="p-4 text-sm font-semibold text-slate-300">
                              {directCount} {directCount === 1 ? 'policy' : 'policies'}
                            </td>
                            <td className="p-4 text-sm font-semibold text-slate-300">
                              {groupCount} {groupCount === 1 ? 'group' : 'groups'}
                            </td>
                            <td className="p-4">
                              {u.boundary === 'yes' ? (
                                <span className="inline-flex items-center space-x-1 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-semibold">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  <span>Enforced</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">None</span>
                              )}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => fetchUserDetails(u.id)}
                                className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="text-xs px-1">Details</span>
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
          </>
        )}

        {/* DETAIL VIEW */}
        {view === 'detail' && selectedUser && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header banner */}
            <div className="flex items-center space-x-3 mb-6 shrink-0">
              <button
                type="button"
                onClick={() => setView('list')}
                className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-white">{selectedUser.name}</h1>
                  {selectedUser.isRoot && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded uppercase">
                      Root
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedUser.email}</p>
              </div>
            </div>

            {/* Content split in columns */}
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* LEFT & CENTER: POLICIES, BOUNDARIES AND EFFECTIVE GRID (2 cols) */}
              <div className="xl:col-span-2 flex flex-col min-h-0 space-y-6">
                
                {/* Upper: Policies and Boundary configurations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
                  
                  {/* Direct Policies Box */}
                  <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col relative">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <Key className="h-4 w-4 text-indigo-400" />
                        <span>Direct Policies</span>
                      </h3>

                      {/* Attach Dropdown trigger */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setPolicySearchText('');
                            setShowAttachPolicyDropdown(!showAttachPolicyDropdown);
                            setShowBoundaryDropdown(false);
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-lg text-indigo-400 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Attach</span>
                        </button>

                        {showAttachPolicyDropdown && (
                          <div className="absolute right-0 mt-2 p-3 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl z-20 w-72 flex flex-col max-h-[200px]">
                            <input
                              type="text"
                              value={policySearchText}
                              onChange={(e) => setPolicySearchText(e.target.value)}
                              placeholder="Search managed policies..."
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none mb-2"
                            />
                            <div className="flex-1 overflow-y-auto space-y-1">
                              {attachablePolicies.length === 0 ? (
                                <p className="text-xs text-slate-500 italic p-2 text-center">No attachable policies.</p>
                              ) : (
                                attachablePolicies.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleAttachPolicy(p.id)}
                                    className="w-full text-left px-2 py-1 hover:bg-slate-950 rounded-md text-xs text-slate-300 hover:text-white"
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

                    <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1">
                      {!selectedUser.directPolicies || selectedUser.directPolicies.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-2">No direct policy attachments.</p>
                      ) : (
                        selectedUser.directPolicies.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between p-2 bg-slate-950/60 border border-slate-850 rounded-xl text-xs">
                            <span className="font-semibold text-slate-300">{p.name}</span>
                            <button
                              onClick={() => handleDetachPolicy(p.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Detach policy"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Permission Boundary Box */}
                  <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col relative">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-indigo-400" />
                        <span>Permission Boundary</span>
                      </h3>

                      {/* Boundary dropdown triggers */}
                      {currentUser.isRoot && (
                        <div className="relative">
                          <button
                            onClick={() => {
                              setBoundarySearchText('');
                              setShowBoundaryDropdown(!showBoundaryDropdown);
                              setShowAttachPolicyDropdown(false);
                            }}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-lg text-indigo-400 cursor-pointer"
                          >
                            <span>Set Boundary</span>
                          </button>

                          {showBoundaryDropdown && (
                            <div className="absolute right-0 mt-2 p-3 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl z-20 w-72 flex flex-col max-h-[200px]">
                              <input
                                type="text"
                                value={boundarySearchText}
                                onChange={(e) => setBoundarySearchText(e.target.value)}
                                placeholder="Search boundary policies..."
                                className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none mb-2"
                              />
                              <div className="flex-1 overflow-y-auto space-y-1">
                                {filterBoundaryPolicies.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic p-2 text-center">No policies found.</p>
                                ) : (
                                  filterBoundaryPolicies.map(p => (
                                    <button
                                      key={p.id}
                                      onClick={() => handleSetBoundary(p.id)}
                                      className="w-full text-left px-2 py-1 hover:bg-slate-950 rounded-md text-xs text-slate-300 hover:text-white"
                                    >
                                      {p.name}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                      {selectedUser.boundary ? (
                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl text-xs space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-indigo-400 flex items-center space-x-1">
                                <ShieldCheck className="h-4 w-4 shrink-0" />
                                <span>Boundary Enforced:</span>
                              </div>
                              <div className="text-slate-300 font-semibold mt-1 font-mono">{selectedUser.boundary.name}</div>
                            </div>
                            {currentUser.isRoot && (
                              <button
                                onClick={handleRemoveBoundary}
                                className="p-1 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Remove boundary"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            This boundary restricts the maximum permission depth allowed for the user, overriding any Allow statements.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500">
                          No permission boundary set. User can execute all actions granted by direct or group policies.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lower: Calculated Effective Permission Summary Matrix */}
                <div className="flex-1 min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2 shrink-0">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Calculated Effective Permissions Matrix</span>
                  </h3>

                  {/* Scrollable Matrix */}
                  <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                    {Object.keys(ACTIONS_BY_NAMESPACE).map(namespace => {
                      const nsActions = ACTIONS_BY_NAMESPACE[namespace];
                      return (
                        <div key={namespace} className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{namespace} Actions</h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {nsActions.map(action => {
                              const calculated = selectedUser.effectivePermissions?.[action] || { allowed: false, source: 'None' };
                              const isAllowed = calculated.allowed;
                              return (
                                <div
                                  key={action}
                                  className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                                    isAllowed
                                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                      : 'bg-slate-900/50 border-slate-850 text-slate-600'
                                  }`}
                                >
                                  <span className="font-mono text-[10px] truncate pr-1" title={action}>
                                    {action.split(':')[1] || action}
                                  </span>

                                  <div className="flex items-center space-x-1 shrink-0">
                                    {isAllowed ? (
                                      <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                                    ) : (
                                      <X className="h-3 w-3 text-slate-700 shrink-0" />
                                    )}
                                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                                      {calculated.source === 'BoundaryBlock' ? 'Blocked' : calculated.source}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: GROUP MEMBERSHIPS LISTING (1 col) */}
              <div className="flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2 shrink-0">
                  <UsersIcon className="h-4 w-4 text-indigo-400" />
                  <span>Group Memberships</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950 text-slate-500 border border-slate-850">
                    {selectedUser.groups?.length || 0}
                  </span>
                </h3>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {!selectedUser.groups || selectedUser.groups.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                      This user is not a member of any groups.
                    </div>
                  ) : (
                    selectedUser.groups.map((g: any) => {
                      const isExpanded = expandedGroups[g.id] || false;
                      return (
                        <div key={g.id} className="bg-slate-950/80 border border-slate-850 rounded-2xl overflow-hidden">
                          {/* Accordion trigger header */}
                          <button
                            onClick={() => toggleGroupAccordion(g.id)}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-900/40 text-left transition-colors cursor-pointer"
                          >
                            <div className="overflow-hidden pr-2">
                              <span className="text-xs font-bold text-white block truncate">{g.name}</span>
                              <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                                {g.policies?.length || 0} Attached {g.policies?.length === 1 ? 'policy' : 'policies'}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                          </button>

                          {/* Expansion panel details */}
                          {isExpanded && (
                            <div className="p-3 bg-slate-950 border-t border-slate-900 space-y-2">
                              <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Group Policies</h5>
                              {g.policies && g.policies.length > 0 ? (
                                <div className="space-y-1.5">
                                  {g.policies.map((p: any) => (
                                    <div key={p.id} className="p-2 bg-slate-900/50 border border-slate-850 rounded-xl text-[11px] font-semibold text-slate-400">
                                      {p.name}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-600 italic">No policies attached to group.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
