import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Key, Users, User, LogOut, Grid } from 'lucide-react';
import api from '../services/api';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout API call failed', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Grid },
    { name: 'Policies', path: '/iam/policies', icon: Key },
    { name: 'Groups', path: '/iam/groups', icon: Users },
    { name: 'Users', path: '/iam/users', icon: User },
  ];

  return (
    <div className="w-64 min-h-screen bg-slate-950 border-r border-slate-800 text-slate-200 flex flex-col justify-between shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Shield className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Antigravity IAM
            </h1>
            <p className="text-xs text-slate-500 font-medium">Self-Administered</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400'
                }`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between mb-4">
          <div className="overflow-hidden pr-2">
            <div className="text-sm font-semibold text-white truncate">{user.name || 'User'}</div>
            <div className="text-xs text-slate-500 truncate">{user.email || 'user@org.local'}</div>
          </div>
          <div>
            {user.isRoot ? (
              <span className="px-2 py-0.5 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full uppercase tracking-wider animate-pulse">
                Root
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full uppercase tracking-wider">
                Member
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 hover:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
