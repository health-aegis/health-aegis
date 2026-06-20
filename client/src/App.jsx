import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import PatientsList from './pages/caregiver/PatientsList';
import AlertsFeed from './pages/caregiver/AlertsFeed';
import AdminDashboard from './pages/AdminDashboard';
import SystemAnalytics from './pages/admin/SystemAnalytics';
import AiMonitor from './pages/admin/AiMonitor';
import UserManagement from './pages/admin/UserManagement';
import MedicalRecords from './pages/patient/MedicalRecords';
import Medications from './pages/patient/Medications';
import Appointments from './pages/patient/Appointments';
import ChatAssistant from './pages/patient/ChatAssistant';
import Notifications from './pages/patient/Notifications';
import HealthAnalytics from './pages/patient/HealthAnalytics';
import ActivityTracker from './pages/patient/ActivityTracker';
import MedicalImaging from './pages/patient/MedicalImaging';
import AgentAnalysis from './pages/patient/AgentAnalysis';
import Settings from './pages/Settings';

import Layout from './components/Layout';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/login" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  
  // Dynamic root redirection based on user role
  const getRootRedirect = () => {
    if (!user) return "/login";
    if (user.role === 'patient') return "/patient";
    if (user.role === 'caregiver') return "/caregiver";
    if (user.role === 'admin') return "/admin";
    return "/login";
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Routes Wrapped in Layout */}
      <Route element={<Layout />}>
        <Route path="/patient" element={
          <ProtectedRoute allowedRole="patient"><PatientDashboard /></ProtectedRoute>
        } />
        <Route path="/patient/records" element={
          <ProtectedRoute allowedRole="patient"><MedicalRecords /></ProtectedRoute>
        } />
        <Route path="/patient/medications" element={
          <ProtectedRoute allowedRole="patient"><Medications /></ProtectedRoute>
        } />
        <Route path="/patient/appointments" element={
          <ProtectedRoute allowedRole="patient"><Appointments /></ProtectedRoute>
        } />
        <Route path="/patient/activity" element={
          <ProtectedRoute allowedRole="patient"><ActivityTracker /></ProtectedRoute>
        } />
        <Route path="/patient/imaging" element={
          <ProtectedRoute allowedRole="patient"><MedicalImaging /></ProtectedRoute>
        } />
        <Route path="/patient/agent-analysis" element={
          <ProtectedRoute allowedRole="patient"><AgentAnalysis /></ProtectedRoute>
        } />
        <Route path="/patient/chat" element={
          <ProtectedRoute allowedRole="patient"><ChatAssistant /></ProtectedRoute>
        } />
        <Route path="/patient/notifications" element={
          <ProtectedRoute allowedRole="patient"><Notifications /></ProtectedRoute>
        } />
        <Route path="/patient/analytics" element={
          <ProtectedRoute allowedRole="patient"><HealthAnalytics /></ProtectedRoute>
        } />
        
        {/* Settings is available to all logged in roles */}
        <Route path="/settings" element={
          <ProtectedRoute><Settings /></ProtectedRoute>
        } />
        <Route path="/caregiver" element={
          <ProtectedRoute allowedRole="caregiver"><CaregiverDashboard /></ProtectedRoute>
        } />
        <Route path="/caregiver/patients" element={
          <ProtectedRoute allowedRole="caregiver"><PatientsList /></ProtectedRoute>
        } />
        <Route path="/caregiver/alerts" element={
          <ProtectedRoute allowedRole="caregiver"><AlertsFeed /></ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute allowedRole="admin"><SystemAnalytics /></ProtectedRoute>
        } />
        <Route path="/admin/ai-monitor" element={
          <ProtectedRoute allowedRole="admin"><AiMonitor /></ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRole="admin"><UserManagement /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to={getRootRedirect()} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
