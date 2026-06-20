import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [activeAlerts, setActiveAlerts] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('alert', (data) => {
        setActiveAlerts(true);
      });
    }
    return () => {
      if (socket) socket.off('alert');
    };
  }, [socket]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-topnav">
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <input 
          type="text" 
          placeholder="Search records, medications..." 
          style={{
            background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)',
            padding: '0.5rem 1rem', borderRadius: '8px', color: '#fff', width: '300px'
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* AI Agent Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(20, 184, 166, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
          <div className="status-dot" style={{ color: 'var(--accent-teal)' }}></div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', fontWeight: '600' }}>AI Agent Active</span>
        </div>

        {/* Notifications */}
        <div 
          style={{ position: 'relative', cursor: 'pointer', fontSize: '1.25rem' }}
          onClick={() => setActiveAlerts(false)}
        >
          🔔
          {activeAlerts && (
            <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-rose)', width: '8px', height: '8px', borderRadius: '50%' }}></span>
          )}
        </div>

        {/* User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-glass)', paddingLeft: '1.5rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user?.role?.charAt(0).toUpperCase()}
          </div>
          <button 
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Logout
          </button>
        </div>
        
      </div>
    </header>
  );
}
