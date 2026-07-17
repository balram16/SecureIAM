import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Policies from '../pages/Policies';
import Groups from '../pages/Groups';
import Users from '../pages/Users';
import NotFound from '../pages/NotFound';
import LandingPage from '../pages/LandingPage';
import Reports from '../pages/Reports';
import Alerts from '../pages/Alerts';
import Settings from '../pages/Settings';
import AuditLogs from '../pages/AuditLogs';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/iam/policies" element={
        <ProtectedRoute>
          <Policies />
        </ProtectedRoute>
      } />

      <Route path="/iam/groups" element={
        <ProtectedRoute>
          <Groups />
        </ProtectedRoute>
      } />

      <Route path="/iam/users" element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } />

      {/* Live Playground Routes */}
      <Route path="/playground/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />

      <Route path="/playground/alerts" element={
        <ProtectedRoute>
          <Alerts />
        </ProtectedRoute>
      } />

      <Route path="/playground/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />

      <Route path="/playground/audit" element={
        <ProtectedRoute>
          <AuditLogs />
        </ProtectedRoute>
      } />

      {/* Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
