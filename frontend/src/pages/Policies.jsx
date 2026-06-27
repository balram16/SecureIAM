import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Plus, Trash2, Edit3, Eye, FileText, ChevronLeft, AlertCircle, Check, Search, X } from 'lucide-react';

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
  const [view, setView] = useState('list'); // list | create | edit | detail
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('MANAGED');
  const [statements, setStatements] = useState([
    { Effect: 'Allow', Action: [], Resource: ['*'] }
  ]);
  const [attachToType, setAttachToType] = useState('user');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const [actionSearch, setActionSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/iam/policies');
      setPolicies(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch policies. Verify your access rights.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicyDetails = async (id) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/iam/policies/${id}`);
      setSelectedPolicy(res.data.data);
      setView('detail');
    } catch (err) {
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

  const handleEditOpen = (policy) => {
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

  const handleRemoveStatement = (index) => {
    if (statements.length === 1) return;
    setStatements(statements.filter((_, i) => i !== index));
  };

  const handleStatementChange = (index, field, value) => {
    const updated = [...statements];
    updated[index][field] = value;
    setStatements(updated);
  };

  const handleToggleAction = (stmtIndex, action) => {
    const updated = [...statements];
    const currentActions = updated[stmtIndex].Action;
    if (currentActions.includes(action)) {
      updated[stmtIndex].Action = currentActions.filter(a => a !== action);
    } else {
      updated[stmtIndex].Action = [...currentActions, action];
    }
    setStatements(updated);
  };

  const handleSave = async (e) => {
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
      const payload = {
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
        await api.put(`/iam/policies/${selectedPolicy.id}`, {
          name: name.trim(),
          description: description.trim(),
          statements
        });
      }
      
      setView('list');
      fetchPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save policy.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setLoading(true);
    try {
      await api.delete(`/iam/policies/${selectedPolicy.id}`);
      setShowDeleteConfirm(false);
      setView('list');
      fetchPolicies();
    } catch (err) {
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
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      <Sidebar />

      <div className="flex-1 overflow-y-auto bg-slate-950 p-8 relative flex flex-col">
        {/* Orbs */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl -z-10"></div>

        {/* Top alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-start space-x-3 text-sm shrink-0">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Operation Error:</span> {error}
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
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Access Policies</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Manage standalone reusable (MANAGED) or inline (INLINE) policies defining route privileges.
                </p>
              </div>
              <button
                onClick={handleCreateOpen}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
              >
                <Plus className="h-4 w-4" />
                <span>Create Policy</span>
              </button>
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
                placeholder="Search policies by name or description..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            {/* Table Container */}
            <div className="flex-1 min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Policy Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Statements</th>
                      <th className="p-4">Created At</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {loading && policies.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                          Fetching policies from database...
                        </td>
                      </tr>
                    ) : filteredPolicies.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                          No policies found.
                        </td>
                      </tr>
                    ) : (
                      filteredPolicies.map((p) => {
                        const stmtCount = p.statements?.statements?.length || 0;
                        return (
                          <tr key={p.id} className="hover:bg-slate-900/30 group">
                            <td className="p-4 pl-6">
                              <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                {p.name}
                              </div>
                              {p.description && (
                                <div className="text-xs text-slate-500 mt-1 max-w-sm truncate">
                                  {p.description}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                p.type === 'MANAGED'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {p.type}
                              </span>
                            </td>
                            <td className="p-4 text-sm font-semibold text-slate-300">
                              {stmtCount} {stmtCount === 1 ? 'statement' : 'statements'}
                            </td>
                            <td className="p-4 text-xs text-slate-500">
                              {new Date(p.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => fetchPolicyDetails(p.id)}
                                  className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEditOpen(p)}
                                  className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="Edit Policy"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              </div>
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
        {view === 'detail' && selectedPolicy && (
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
                  <h1 className="text-2xl font-bold text-white">{selectedPolicy.name}</h1>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    selectedPolicy.type === 'MANAGED'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {selectedPolicy.type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedPolicy.description || 'No description provided'}</p>
              </div>
            </div>

            {/* Split Details Content */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Policy JSON display */}
              <div className="lg:col-span-2 flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <span className="text-sm font-bold text-white flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <span>Policy Document JSON</span>
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditOpen(selectedPolicy)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-semibold rounded-lg cursor-pointer text-slate-300"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/50 text-xs font-semibold rounded-lg cursor-pointer text-rose-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto bg-slate-950 border border-slate-850 rounded-2xl p-4 font-mono text-xs text-emerald-400 select-all">
                  <pre>{JSON.stringify(selectedPolicy.statements, null, 2)}</pre>
                </div>
              </div>

              {/* Attachments Sidebar */}
              <div className="flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-4 shrink-0">Policy Attachments</h3>
                
                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto space-y-6">
                  {/* Users */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Attached to Users</h4>
                    {selectedPolicy.users && selectedPolicy.users.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedPolicy.users.map((u) => (
                          <div key={u.user.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold">
                            {u.user.name} ({u.user.email})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Not attached to any users.</p>
                    )}
                  </div>

                  {/* Groups */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Attached to Groups</h4>
                    {selectedPolicy.groups && selectedPolicy.groups.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedPolicy.groups.map((g) => (
                          <div key={g.group.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold">
                            {g.group.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Not attached to any groups.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Delete Access Policy</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Are you sure you want to delete policy <span className="text-white font-semibold">{selectedPolicy.name}</span>? This action is permanent and will detach it from all groups or users.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-sm font-semibold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl cursor-pointer shadow-md"
                    >
                      {loading ? 'Deleting...' : 'Delete Policy'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CREATE / EDIT VIEW (POLICY BUILDER) */}
        {(view === 'create' || view === 'edit') && (
          <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setView(view === 'create' ? 'list' : 'detail')}
                  className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h1 className="text-2xl font-bold text-white">
                  {view === 'create' ? 'Create New Policy' : `Edit Policy: ${selectedPolicy?.name}`}
                </h1>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                {loading ? 'Saving...' : 'Save Policy'}
              </button>
            </div>

            {/* Split Content */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form Input fields and Statement Builder (60% / col-span-3) */}
              <div className="lg:col-span-3 flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                {/* Meta details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 shrink-0">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Policy Name
                    </label>
                    <input
                      type="text"
                      required
                      disabled={view === 'edit'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. FinanceReportsAccess"
                      className="w-full bg-slate-950 border border-slate-850 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Policy Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      disabled={view === 'edit'}
                      className="w-full bg-slate-950 border border-slate-850 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    >
                      <option value="MANAGED">MANAGED (Reusable)</option>
                      <option value="INLINE">INLINE (Coupled to single identity)</option>
                    </select>
                  </div>
                  {type === 'INLINE' && view === 'create' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Attach To Type
                        </label>
                        <select
                          value={attachToType}
                          onChange={(e) => setAttachToType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                        >
                          <option value="user">User</option>
                          <option value="group">Group</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          {attachToType === 'user' ? 'Select Target User' : 'Select Target Group'}
                        </label>
                        <select
                          value={attachToType === 'user' ? targetUserId : targetGroupId}
                          onChange={(e) => {
                            if (attachToType === 'user') {
                              setTargetUserId(e.target.value);
                            } else {
                              setTargetGroupId(e.target.value);
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
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
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Description
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Allows access to specific business units..."
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-850/80 my-2 shrink-0"></div>

                {/* Statements header */}
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-bold text-white">Policy Statements</h3>
                  <button
                    type="button"
                    onClick={handleAddStatement}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-lg text-indigo-400 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Statement</span>
                  </button>
                </div>

                {/* Scrollable list of statements */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  {statements.map((stmt, stmtIndex) => (
                    <div
                      key={stmtIndex}
                      className="relative p-5 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-4 shadow-md group"
                    >
                      {/* Delete statement button */}
                      {statements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStatement(stmtIndex)}
                          className="absolute top-4 right-4 p-1.5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <span className="absolute top-4 left-4 text-[10px] font-bold bg-slate-900 text-slate-500 border border-slate-850 px-2 py-0.5 rounded-full">
                        Statement #{stmtIndex + 1}
                      </span>

                      <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Effect Toggle */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Effect
                          </label>
                          <div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-xl max-w-[200px]">
                            <button
                              type="button"
                              onClick={() => handleStatementChange(stmtIndex, 'Effect', 'Allow')}
                              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                stmt.Effect === 'Allow'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Allow
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatementChange(stmtIndex, 'Effect', 'Deny')}
                              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                stmt.Effect === 'Deny'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Deny
                            </button>
                          </div>
                        </div>

                        {/* Resource Locked Input */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Resource
                          </label>
                          <input
                            type="text"
                            disabled
                            value='["*"]'
                            className="w-full max-w-[200px] bg-slate-900 border border-slate-850 opacity-40 cursor-not-allowed rounded-xl py-1.5 px-3 text-slate-400 font-mono text-xs"
                          />
                        </div>

                        {/* Action Multi-select Checklist */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Actions
                          </label>
                          
                          {/* Selected Actions badges */}
                          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900 border border-slate-850 rounded-xl min-h-[42px] mb-2">
                            {stmt.Action.length === 0 ? (
                              <span className="text-xs text-slate-600 p-1 italic">No actions selected. Choose from dropdown below.</span>
                            ) : (
                              stmt.Action.map(act => (
                                <span
                                  key={act}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md"
                                >
                                  <span>{act}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAction(stmtIndex, act)}
                                    className="hover:text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>

                          {/* Toggle Dropdown panel Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setActionSearch('');
                                setActiveDropdownIndex(activeDropdownIndex === stmtIndex ? null : stmtIndex);
                              }}
                              className="w-full flex items-center justify-between bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                            >
                              <span>Manage Policy Actions</span>
                              <Plus className="h-4 w-4 text-slate-400" />
                            </button>

                            {/* Dropdown contents */}
                            {activeDropdownIndex === stmtIndex && (
                              <div className="absolute left-0 right-0 mt-2 p-3 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl z-20 flex flex-col max-h-[300px]">
                                {/* Dropdown Search Box */}
                                <div className="relative mb-2 shrink-0">
                                  <input
                                    type="text"
                                    value={actionSearch}
                                    onChange={(e) => setActionSearch(e.target.value)}
                                    placeholder="Filter action strings..."
                                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>

                                {/* Checklist */}
                                <div className="flex-1 overflow-y-auto space-y-1">
                                  {VALID_ACTIONS.filter(act => act.toLowerCase().includes(actionSearch.toLowerCase())).map(act => {
                                    const isChecked = stmt.Action.includes(act);
                                    return (
                                      <label
                                        key={act}
                                        className="flex items-center space-x-2.5 px-2 py-1.5 hover:bg-slate-950 rounded-lg cursor-pointer text-xs transition-colors"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleAction(stmtIndex, act)}
                                          className="rounded border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                                        />
                                        <span className={`font-mono ${isChecked ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
                                          {act}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* JSON Live Preview (40% / col-span-2) */}
              <div className="lg:col-span-2 flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                <span className="text-sm font-bold text-white mb-4 flex items-center space-x-2 shrink-0">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  <span>Real-Time JSON Preview</span>
                </span>

                <div className="flex-1 min-h-0 overflow-auto bg-slate-950 border border-slate-850 rounded-2xl p-4 font-mono text-[11px] text-emerald-400 select-all">
                  <pre>{getJsonPreview()}</pre>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Policies;
