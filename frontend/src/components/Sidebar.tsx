import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Key, Users, User, LogOut, LayoutDashboard, Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const [isIamOpen, setIsIamOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout API call failed', err);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  const initials = (user?.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <motion.div
      initial={false}
      animate={{ 
        width: isCollapsed ? 72 : 260
      }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="relative min-h-screen bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex flex-col justify-between shrink-0 select-none"
    >
      <div>
        {/* Brand Header & Toggle Button */}
        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-[64px] shrink-0 overflow-hidden`}>
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2.5 overflow-hidden"
              >
                <Link to="/dashboard" className="flex items-center gap-2.5 group shrink-0">
                  <div className="p-2 bg-primary/15 text-primary rounded-xl border border-primary/20 shadow-lg shadow-primary/5 group-hover:shadow-primary/15 transition-all duration-300">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight text-foreground whitespace-nowrap">
                      SecureIAM
                    </span>
                    <span className="text-[9px] text-muted-foreground font-medium tracking-wide uppercase">Console</span>
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div layout transition={{ type: 'spring', stiffness: 220, damping: 26 }} className="shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg cursor-pointer"
              onClick={toggleSidebar}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        <Separator className="opacity-50" />

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 mt-2">
          {/* Dashboard */}
            <Link
              to="/dashboard"
              className={`relative flex items-center py-2.5 rounded-xl transition-all duration-300 group text-[13px] font-medium ${
                isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'
              } ${
                location.pathname === '/dashboard'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title={isCollapsed ? 'Dashboard' : undefined}
            >
              {location.pathname === '/dashboard' && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <LayoutDashboard className={`h-[18px] w-[18px] transition-all duration-200 shrink-0 ${
                location.pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'
              }`} />
              
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    Dashboard
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

          {/* IAM Console Section */}
          {isCollapsed ? (
            <div className="space-y-1 pt-2 border-t border-sidebar-border/30 mt-2">
              {[
                { name: 'Policies', path: '/iam/policies', icon: Key },
                { name: 'Groups', path: '/iam/groups', icon: Users },
                { name: 'Users', path: '/iam/users', icon: User }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center justify-center py-2.5 rounded-xl transition-all duration-300 group text-muted-foreground hover:text-foreground hover:bg-muted/50 ${
                      isActive ? 'bg-primary/10 text-primary' : ''
                    }`}
                    title={item.name}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full"
                        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                      />
                    )}
                    <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'}`} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1 mt-3">
              <button
                onClick={() => setIsIamOpen(!isIamOpen)}
                className="w-full flex items-center justify-between py-2 px-3 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  IAM Console
                </span>
                {isIamOpen ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground/60" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isIamOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-0.5 pl-2 mt-1"
                  >
                    {[
                      { name: 'Policies', path: '/iam/policies', icon: Key },
                      { name: 'Groups', path: '/iam/groups', icon: Users },
                      { name: 'Users', path: '/iam/users', icon: User }
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`relative flex items-center gap-3 py-2 px-4 rounded-xl transition-all duration-300 group text-[13px] font-medium ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeNav"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full"
                              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                            />
                          )}
                          <Icon className={`h-[16px] w-[16px] transition-all duration-200 shrink-0 ${
                            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'
                          }`} />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>
      </div>

      {/* User Session Footer */}
      <div className="p-4.5 border-t border-sidebar-border overflow-hidden shrink-0">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div 
            className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 cursor-help"
            title={isCollapsed ? `${user?.name || 'User'} (${user?.email || 'user@org.local'})` : undefined}
          >
            {initials}
          </div>
          
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-sm font-semibold text-foreground truncate">{user?.name || 'User'}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{user?.email || 'user@org.local'}</div>
                </div>
                {user?.isRoot ? (
                  <Badge variant="destructive" className="shrink-0 text-[9px]">Root</Badge>
                ) : (
                  <Badge variant="default" className="shrink-0 text-[9px]">Member</Badge>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center"
            >
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                title="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Sidebar;
