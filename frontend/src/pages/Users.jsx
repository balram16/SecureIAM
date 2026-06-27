import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { ChevronLeft, ChevronDown, ChevronUp, AlertCircle, Search, X, Check, Eye, Plus, ShieldCheck, ShieldAlert, Shield, Trash2, Key, Users as UsersIcon } from 'lucide-react';

const ACTIONS_BY_NAMESPACE = {
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
  const [view, setView] = useState('list'); // list | detail
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Authenticated user state
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // managed policies for attach / boundary options
  const [allPolicies, setAllPolicies] = useState([]);

  // Accordion state for groups: { groupId: true/false }
  const [expandedGroups, setExpandedGroups] = useState({});

  // Dropdown states
  const [showAttachPolicyDropdown, setShowAttachPolicyDropdown] = useState(false);
  const [showBoundaryDropdown, setShowBoundaryDropdown] = useState(false);
  const [policySearchText, setPolicySearchText] = useState('');
  const [boundarySearchText, setBoundarySearchText] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/iam/users');
      setUsers(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users. Verify your access rights.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (id) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/iam/users/${id}`);
      setSelectedUser(res.data.data);
      setExpandedGroups({});
      setView('detail');

      // Pre-fetch managed policies for attach / boundary
      fetchAvailablePolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user profile details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePolicies = async () => {
    try {
      const res = await api.get('/iam/policies');
      // Only managed policies can be attached or used as boundaries
      setAllPolicies(res.data.data.filter(p => p.type === 'MANAGED'));
    } catch (err) {
      console.error('Failed to load policies', err);
    }
  };

  const handleAttachPolicy = async (policyId) => {
    setError('');
    try {
      await api.post(`/iam/users/${selectedUser.id}/policies`, { policyId });
      setShowAttachPolicyDropdown(false);
      setPolicySearchText('');
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to attach policy directly.');
    }
  };

  const handleDetachPolicy = async (policyId) => {
    setError('');
    try {
      await api.delete(`/iam/users/${selectedUser.id}/policies/${policyId}`);
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to detach policy.');
    }
  };

  const handleSetBoundary = async (policyId) => {
    setError('');
    try {
      await api.put(`/iam/users/${selectedUser.id}/boundary`, { policyId });
      setShowBoundaryDropdown(false);
      setBoundarySearchText('');
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set permission boundary.');
    }
  };

  const handleRemoveBoundary = async () => {
    setError('');
    try {
      await api.delete(`/iam/users/${selectedUser.id}/boundary`);
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove permission boundary.');
    }
  };

  const toggleGroupAccordion = (groupId) => {
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
  const currentDirectPolicyIds = selectedUser?.directPolicies?.map(p => p.id) || [];
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

            {/* Users Table */}
            <div className="flex-1 min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">User Name</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Groups</th>
                      <th className="p-4">Direct Policies</th>
                      <th className="p-4">Boundary Active</th>
                      <th className="p-4 pr-6 text-right">Console</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {loading && users.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500">
                          Fetching user accounts...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-900/30 group">
                          <td className="p-4 pl-6">
                            <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                              {u.name}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              {u.email}
                            </div>
                          </td>
                          <td className="p-4">
                            {u.isRoot ? (
                              <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider animate-pulse">
                                Root
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-800 text-slate-400 border border-slate-700/50 uppercase tracking-wider">
                                Member
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-slate-350">{u.groupCount}</td>
                          <td className="p-4 text-sm text-slate-350">{u.directPolicyCount}</td>
                          <td className="p-4 text-sm">
                            {u.boundary === 'yes' ? (
                              <span className="px-2.5 py-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center space-x-1 max-w-max">
                                <Shield className="h-3 w-3 shrink-0" />
                                <span>Capped</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600">None</span>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => fetchUserDetails(u.id)}
                              className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Inspect User IAM Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* DETAIL VIEW (USER PROFILE CONSOLE) */}
        {view === 'detail' && selectedUser && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-6 shrink-0">
              <button
                onClick={() => setView('list')}
                className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-white">{selectedUser.name}</h1>
                  {selectedUser.isRoot ? (
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                      Root User
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-800 text-slate-400 border border-slate-700/50 uppercase tracking-wider">
                      Member Account
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-450 mt-1 font-mono">{selectedUser.email}</p>
              </div>
            </div>

            {/* Split Content: Profiles Info (Left) vs Effective Permissions Summary (Right) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-5 gap-6">
              
              {/* Profile Config Cards (Left: 3/5 cols) */}
              <div className="xl:col-span-3 space-y-6 overflow-y-auto pr-2 min-h-0">
                
                {/* SECTION 1: DIRECT IDENTITY POLICIES */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Key className="h-4 w-4 text-indigo-400" />
                      <span>Direct Identity Policies</span>
                    </h3>
                    
                    {/* Attach Direct Policy Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowAttachPolicyDropdown(!showAttachPolicyDropdown)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-semibold rounded-lg text-indigo-400 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Attach Policy</span>
                      </button>

                      {showAttachPolicyDropdown && (
                        <div className="absolute right-0 mt-2 p-3 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl z-30 w-72 flex flex-col max-h-[250px]">
                          <input
                            type="text"
                            value={policySearchText}
                            onChange={(e) => setPolicySearchText(e.target.value)}
                            placeholder="Search policies..."
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-650 focus:outline-none mb-2"
                          />
                          <div className="flex-1 overflow-y-auto space-y-1">
                            {attachablePolicies.length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic text-center p-2">No attachable policies found.</p>
                            ) : (
                              attachablePolicies.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => handleAttachPolicy(p.id)}
                                  className="w-full flex items-center justify-between p-2 hover:bg-slate-950 rounded-lg text-left text-xs transition-colors group cursor-pointer"
                                >
                                  <span className="font-semibold text-slate-200 group-hover:text-indigo-400">{p.name}</span>
                                  <Plus className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400" />
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct policies list */}
                  <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/30 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="p-3 pl-4">Policy Name</th>
                          <th className="p-3">Type</th>
                          <th className="p-3 pr-4 text-right">Detach</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/50">
                        {selectedUser.directPolicies.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="p-5 text-center text-slate-500 italic">
                              No direct policies attached.
                            </td>
                          </tr>
                        ) : (
                          selectedUser.directPolicies.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-900/10">
                              <td className="p-3 pl-4 font-semibold text-slate-200">{p.name}</td>
                              <td className="p-3 text-slate-400">
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {p.type}
                                </span>
                              </td>
                              <td className="p-3 pr-4 text-right">
                                <button
                                  onClick={() => handleDetachPolicy(p.id)}
                                  className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                  title="Detach Policy"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION 2: GROUP MEMBERSHIPS ACCORDION */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-4">
                    <UsersIcon className="h-4 w-4 text-indigo-400" />
                    <span>Group Memberships & Inherited Policies</span>
                  </h3>

                  {selectedUser.groups.length === 0 ? (
                    <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl text-xs text-slate-500 italic text-center">
                      This user is not a member of any groups.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedUser.groups.map((group) => {
                        const isExpanded = expandedGroups[group.id];
                        return (
                          <div key={group.id} className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-2xl overflow-hidden transition-all">
                            {/* Accordion trigger */}
                            <button
                              onClick={() => toggleGroupAccordion(group.id)}
                              className="w-full flex items-center justify-between p-4 text-left text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
                            >
                              <div>
                                <div className="font-bold text-sm text-indigo-400">{group.name}</div>
                                {group.description && <div className="text-[10px] text-slate-500 mt-0.5">{group.description}</div>}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 text-[10px] bg-slate-900 border border-slate-850 text-slate-400 rounded-full font-bold">
                                  {group.policies.length} {group.policies.length === 1 ? 'inherited policy' : 'inherited policies'}
                                </span>
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                              </div>
                            </button>

                            {/* Accordion panel */}
                            {isExpanded && (
                              <div className="px-4 pb-4 border-t border-slate-850/50 bg-slate-950/40">
                                <div className="mt-3 space-y-1.5">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Attached Policies:</div>
                                  {group.policies.length === 0 ? (
                                    <p className="text-[11px] text-slate-500 italic">No policies attached to this group.</p>
                                  ) : (
                                    group.policies.map(gp => (
                                      <div key={gp.id} className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-850 rounded-xl text-[11px]">
                                        <span className="font-semibold text-slate-350">{gp.name}</span>
                                        <span className="px-1.5 py-0.5 text-[8px] bg-slate-950 text-slate-500 border border-slate-850 rounded">
                                          {gp.type}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* BOUNDARY SECTION (VISIBLE ONLY IF LOGGED IN USER IS ROOT) */}
                {currentUser.isRoot && (
                  <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-amber-500" />
                          <span>Permission Boundary (Root Admin Control)</span>
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-md">
                          Sets a maximum ceiling on user rights. The user cannot exceed this limit regardless of identity/group Allow statements.
                        </p>
                      </div>

                      {/* Boundary attachment dropdown control */}
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setShowBoundaryDropdown(!showBoundaryDropdown)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-semibold rounded-lg text-amber-400 border-amber-500/20 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Set Boundary</span>
                        </button>

                        {showBoundaryDropdown && (
                          <div className="absolute right-0 mt-2 p-3 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl z-30 w-72 flex flex-col max-h-[250px]">
                            <input
                              type="text"
                              value={boundarySearchText}
                              onChange={(e) => setBoundarySearchText(e.target.value)}
                              placeholder="Search managed policies..."
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-650 focus:outline-none mb-2"
                            />
                            <div className="flex-1 overflow-y-auto space-y-1">
                              {filterBoundaryPolicies.length === 0 ? (
                                <p className="text-[11px] text-slate-500 italic text-center p-2">No policies found.</p>
                              ) : (
                                filterBoundaryPolicies.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleSetBoundary(p.id)}
                                    className="w-full flex items-center justify-between p-2 hover:bg-slate-950 rounded-lg text-left text-xs transition-colors group cursor-pointer"
                                  >
                                    <span className="font-semibold text-slate-200 group-hover:text-amber-400">{p.name}</span>
                                    <Plus className="h-3.5 w-3.5 text-slate-500 group-hover:text-amber-400" />
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Boundary Details block */}
                    {selectedUser.boundary ? (
                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-amber-400 font-mono">{selectedUser.boundary.name}</span>
                            <span className="px-1.5 py-0.5 text-[8px] bg-slate-900 border border-slate-850 text-slate-400 rounded uppercase tracking-wider font-bold">Active Ceiling</span>
                          </div>
                          {selectedUser.boundary.description && (
                            <p className="text-[11px] text-slate-500 mt-1 max-w-sm truncate">{selectedUser.boundary.description}</p>
                          )}
                        </div>
                        <button
                          onClick={handleRemoveBoundary}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/50 text-xs font-semibold rounded-lg cursor-pointer text-rose-400 shrink-0 self-end sm:self-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove Boundary</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950/50 border border-slate-850 border-dashed rounded-2xl text-xs text-slate-500 italic text-center">
                        No active permission boundary caps this user account.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* EFFECTIVE PERMISSIONS SUMMARY GRID (Right: 2/5 cols) */}
              <div className="xl:col-span-2 flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="shrink-0 mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Effective Permissions Summary</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Resolved permission states representing the mathematical intersection of direct, group, and boundary statements.
                  </p>
                </div>

                {/* Categories container */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {Object.entries(ACTIONS_BY_NAMESPACE).map(([namespace, actions]) => (
                    <div key={namespace} className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2.5 border-b border-slate-850/60 pb-1.5">
                        {namespace} Services
                      </h4>
                      
                      <div className="space-y-2">
                        {actions.map(action => {
                          const isAllowed = selectedUser.effectivePermissions?.[action];
                          return (
                            <div key={action} className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-900/30 transition-colors">
                              <span className="font-mono text-[11px] text-slate-350 truncate pr-2" title={action}>
                                {action}
                              </span>
                              
                              {isAllowed ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center space-x-0.5 shrink-0">
                                  <Check className="h-3 w-3 shrink-0" />
                                  <span>Allowed</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded flex items-center space-x-0.5 shrink-0">
                                  <X className="h-3 w-3 shrink-0" />
                                  <span>Denied</span>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
