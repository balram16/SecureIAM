import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Plus, Trash2, Edit3, Eye, ChevronLeft, AlertCircle, Search, X, UserPlus, UserMinus, ShieldAlert } from 'lucide-react';

const Groups = () => {
  const [view, setView] = useState('list'); // list | detail
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Listing data for selections
  const [allUsers, setAllUsers] = useState([]);
  const [allPolicies, setAllPolicies] = useState([]);

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

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/iam/groups');
      setGroups(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch groups. Verify your access rights.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (id) => {
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
    } catch (err) {
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
      setAllPolicies(res.data.data.filter(p => p.type === 'MANAGED'));
    } catch (err) {
      console.error('Failed to load policy list', err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/iam/groups', { name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      setShowCreateModal(false);
      fetchGroups();
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete group.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (userId) => {
    setError('');
    try {
      await api.post(`/iam/groups/${selectedGroup.id}/members`, { userId });
      setShowAddUserDropdown(false);
      setUserSearchText('');
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add user to group.');
    }
  };

  const handleRemoveUser = async (userId) => {
    setError('');
    try {
      await api.delete(`/iam/groups/${selectedGroup.id}/members/${userId}`);
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove user from group.');
    }
  };

  const handleAttachPolicy = async (policyId) => {
    setError('');
    try {
      await api.post(`/iam/groups/${selectedGroup.id}/policies`, { policyId });
      setShowAttachPolicyDropdown(false);
      setPolicySearchText('');
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to attach policy to group.');
    }
  };

  const handleDetachPolicy = async (policyId) => {
    setError('');
    try {
      await api.delete(`/iam/groups/${selectedGroup.id}/policies/${policyId}`);
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to detach policy from group.');
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter lists for dropdown addition
  const currentMemberIds = selectedGroup?.members?.map(m => m.id) || [];
  const addableUsers = allUsers.filter(u => 
    !currentMemberIds.includes(u.id) &&
    (u.name.toLowerCase().includes(userSearchText.toLowerCase()) || u.email.toLowerCase().includes(userSearchText.toLowerCase()))
  );

  const currentPolicyIds = selectedGroup?.policies?.map(p => p.id) || [];
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

        {/* Global error block */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-start space-x-3 text-sm shrink-0">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Operation Alert:</span> {error}
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
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Organization Groups</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Manage logical sets of users inheriting standard permission sets. No group nesting is permitted.
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

            {/* Search Bar */}
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

            {/* Table Container */}
            <div className="flex-1 min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Group Name</th>
                      <th className="p-4">Members</th>
                      <th className="p-4">Attached Policies</th>
                      <th className="p-4">Created At</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {loading && groups.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                          Fetching groups list...
                        </td>
                      </tr>
                    ) : filteredGroups.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                          No groups found.
                        </td>
                      </tr>
                    ) : (
                      filteredGroups.map((g) => (
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
                            {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                          </td>
                          <td className="p-4 text-sm font-semibold text-slate-300">
                            {g.policyCount} {g.policyCount === 1 ? 'policy' : 'policies'}
                          </td>
                          <td className="p-4 text-xs text-slate-500">
                            {new Date(g.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => fetchGroupDetails(g.id)}
                              className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Manage Group console"
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

            {/* Create Group Modal */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <form onSubmit={handleCreateGroup} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white">Create New Group</h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Auditors"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Has read access to audit logs..."
                      rows="3"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    ></textarea>
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
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setView('list')}
                  className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {isEditingMeta ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white font-bold"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400"
                    />
                    <button
                      onClick={handleUpdateGroupMeta}
                      className="px-3 py-1.5 bg-indigo-600 text-xs font-semibold rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingMeta(false)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-3">
                      <h1 className="text-2xl font-bold text-white">{selectedGroup.name}</h1>
                      <button
                        onClick={() => setIsEditingMeta(true)}
                        className="p-1 text-slate-500 hover:text-white"
                        title="Edit Info"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedGroup.description || 'No description provided'}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/50 text-sm font-semibold rounded-xl cursor-pointer text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Group</span>
              </button>
            </div>

            {/* Split panel layout */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* MEMBER LIST CARD */}
              <div className="flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-bold text-white">Group Members</h3>
                  
                  {/* Add user controller button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAddUserDropdown(!showAddUserDropdown)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-semibold rounded-lg text-indigo-400 cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Add Member</span>
                    </button>

                    {/* Add user dropdown */}
                    {showAddUserDropdown && (
                      <div className="absolute right-0 mt-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-30 w-72 flex flex-col max-h-[250px]">
                        <input
                          type="text"
                          value={userSearchText}
                          onChange={(e) => setUserSearchText(e.target.value)}
                          placeholder="Search users..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-600 focus:outline-none mb-2"
                        />
                        <div className="flex-1 overflow-y-auto space-y-1">
                          {addableUsers.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic text-center p-2">No addable users found.</p>
                          ) : (
                            addableUsers.map(u => (
                              <button
                                key={u.id}
                                onClick={() => handleAddUser(u.id)}
                                className="w-full flex items-center justify-between p-2 hover:bg-slate-950 rounded-lg text-left text-xs transition-colors group cursor-pointer"
                              >
                                <div>
                                  <div className="font-semibold text-slate-200 group-hover:text-indigo-400">{u.name}</div>
                                  <div className="text-[10px] text-slate-500">{u.email}</div>
                                </div>
                                <Plus className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400" />
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table of Members */}
                <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-850 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/30 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="p-3 pl-4">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3 pr-4 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {selectedGroup.members.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-6 text-center text-slate-500 italic">
                            This group has no members.
                          </td>
                        </tr>
                      ) : (
                        selectedGroup.members.map((member) => (
                          <tr key={member.id} className="hover:bg-slate-900/10">
                            <td className="p-3 pl-4 font-semibold text-slate-200">{member.name}</td>
                            <td className="p-3 text-slate-400 font-mono">{member.email}</td>
                            <td className="p-3 pr-4 text-right">
                              <button
                                onClick={() => handleRemoveUser(member.id)}
                                className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Remove User from Group"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ATTACHED POLICIES CARD */}
              <div className="flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-bold text-white">Group Policies</h3>
                  
                  {/* Attach Policy button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAttachPolicyDropdown(!showAttachPolicyDropdown)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-semibold rounded-lg text-indigo-400 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Attach Policy</span>
                    </button>

                    {/* Attach Policy dropdown */}
                    {showAttachPolicyDropdown && (
                      <div className="absolute right-0 mt-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-30 w-72 flex flex-col max-h-[250px]">
                        <input
                          type="text"
                          value={policySearchText}
                          onChange={(e) => setPolicySearchText(e.target.value)}
                          placeholder="Search managed policies..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-650 focus:outline-none mb-2"
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
                                <div>
                                  <div className="font-semibold text-slate-200 group-hover:text-indigo-400">{p.name}</div>
                                </div>
                                <Plus className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400" />
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table of Policies */}
                <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-850 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/30 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="p-3 pl-4">Policy Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3 pr-4 text-right">Detach</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {selectedGroup.policies.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-6 text-center text-slate-500 italic">
                            No policies attached to this group.
                          </td>
                        </tr>
                      ) : (
                        selectedGroup.policies.map((p) => (
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

            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Delete Group</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Are you sure you want to delete group <span className="text-white font-semibold">{selectedGroup.name}</span>? This action is permanent, will remove all user memberships, and delete any associated inline policies.
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
