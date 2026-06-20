import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  
  // Role-based links
  const links = {
    patient: [
      { name: 'Dashboard', path: '/patient', icon: '📊' },
      { name: 'Medical Records', path: '/patient/records', icon: '📁' },
      { name: 'Medical Imaging', path: '/patient/imaging', icon: '🩻' },
      { name: 'Multi-Agent Analysis', path: '/patient/agent-analysis', icon: '🤖' },
      { name: 'Medications', path: '/patient/medications', icon: '💊' },
      { name: 'Appointments', path: '/patient/appointments', icon: '📅' },
      { name: 'Activity Tracker', path: '/patient/activity', icon: '🏃' },
      { name: 'AI Assistant', path: '/patient/chat', icon: '🧠' },
      { name: 'Notifications', path: '/patient/notifications', icon: '🔔' },
      { name: 'Health Analytics', path: '/patient/analytics', icon: '📈' },
      { name: 'Settings', path: '/settings', icon: '⚙️' },
    ],
    caregiver: [
      { name: 'Dashboard', path: '/caregiver', icon: '👥' },
      { name: 'Patients', path: '/caregiver/patients', icon: '🛏️' },
      { name: 'Alerts', path: '/caregiver/alerts', icon: '🚨' },
      { name: 'Settings', path: '/settings', icon: '⚙️' },
    ],
    admin: [
      { name: 'Dashboard', path: '/admin', icon: '🛠️' },
      { name: 'System Analytics', path: '/admin/analytics', icon: '📊' },
      { name: 'AI Monitoring', path: '/admin/ai-monitor', icon: '👁️' },
      { name: 'User Management', path: '/admin/users', icon: '👥' },
      { name: 'Settings', path: '/settings', icon: '⚙️' },
    ]
  };

  const navLinks = user ? links[user.role] : [];

  return (
    <aside className="app-sidebar">
      <div className="logo-section" style={{ marginBottom: '3rem' }}>
        <div className="logo-icon" style={{ fontSize: '1.5rem' }}>⚕️</div>
        <div className="logo-text" style={{ fontSize: '1.25rem' }}>Aegis Health</div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navLinks.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            end={link.path.split('/').length === 2}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.75rem 1rem', borderRadius: '8px',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(0, 229, 255, 0.05)' : 'transparent',
              border: isActive ? '1px solid rgba(0, 229, 255, 0.1)' : '1px solid transparent',
              textDecoration: 'none', fontWeight: isActive ? '600' : '500',
              transition: 'all 0.2s'
            })}
          >
            <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
            {link.name}
          </NavLink>
        ))}
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged in as</div>
        <div style={{ fontWeight: '600', color: 'var(--accent-blue)', textTransform: 'capitalize' }}>{user?.role}</div>
      </div>
    </aside>
  );
}
