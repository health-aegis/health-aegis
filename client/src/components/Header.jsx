import React from 'react';
import { HeartPulse, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Header({ isConnected }) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="logo-section">
        <HeartPulse size={36} className="logo-icon" />
        <div>
          <h1 className="logo-text">AEGIS HEALTH</h1>
          <span className="logo-badge">DevOps Agent v1.0</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div className={`connection-status ${isConnected ? '' : 'offline'}`}>
          <div className="status-dot"></div>
          <span>{isConnected ? 'API Gateway Connected' : 'Offline / Mock Mode'}</span>
        </div>

        {user && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '1px solid var(--border-glass)', paddingLeft: '1.5rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#fff' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: '700' }}>{user.role}</div>
            </div>
            <button 
              onClick={logout}
              className="btn-reset-routine" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)' }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
