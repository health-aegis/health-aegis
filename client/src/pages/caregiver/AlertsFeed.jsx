import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { caregiverAPI, medicationsAPI, statusAPI } from '../../services/api';

export default function AlertsFeed() {
  const { user } = useAuth();
  const socket = useSocket();
  const { addToast } = useToast();

  const [alerts, setAlerts] = useState([]);
  const [caregiver, setCaregiver] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loadingCaregiver, setLoadingCaregiver] = useState(true);

  // Load caregiver config and system status on mount
  useEffect(() => {
    Promise.all([caregiverAPI.get(), statusAPI.get()])
      .then(([cgRes, statusRes]) => {
        setCaregiver(cgRes.data);
        setSystemStatus(statusRes.data);
        if (statusRes.data?.caregiverAlerted) {
          setAlerts(prev => [{
            id: Date.now(),
            type: 'Medication',
            severity: 'Critical',
            message: statusRes.data.alertReason || 'Patient has exceeded missed dose threshold.',
            timestamp: statusRes.data.lastNotificationSent || new Date().toISOString(),
            read: false,
          }, ...prev]);
        }
      })
      .catch(() => addToast('Could not load caregiver data.', 'error'))
      .finally(() => setLoadingCaregiver(false));
  }, []);

  // Listen for real-time socket alerts
  useEffect(() => {
    if (!socket) return;
    const handleAlert = (alert) => {
      setAlerts(prev => [{
        id: Date.now(),
        ...alert,
        read: false,
      }, ...prev]);
      addToast(`🚨 ${alert.message}`, 'error');
    };
    socket.on('alert', handleAlert);
    return () => socket.off('alert', handleAlert);
  }, [socket]);

  const handleDismissAlert = async () => {
    try {
      await statusAPI.reset();
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      setSystemStatus(prev => ({ ...prev, caregiverAlerted: false }));
      addToast('All alerts acknowledged and cleared.', 'success');
    } catch {
      addToast('Failed to clear alerts.', 'error');
    }
  };

  const handleMarkRead = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  const formatTime = (ts) => {
    try { return new Date(ts).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return ts; }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Alert Feed</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time patient escalations and notifications.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleDismissAlert} className="btn-submit"
            style={{ padding: '0.6rem 1.2rem', borderRadius: '20px', background: 'var(--accent-rose)', boxShadow: '0 4px 20px rgba(244,63,94,0.3)' }}>
            Clear All ({unreadCount})
          </button>
        )}
      </div>

      <div className="widget-grid">
        {/* Live Status Banner */}
        {systemStatus?.caregiverAlerted && (
          <div className="widget-glass" style={{ gridColumn: 'span 12', border: '1px solid rgba(244,63,94,0.4)', background: 'linear-gradient(90deg, rgba(244,63,94,0.08), transparent)', animation: 'pulse-border 2s infinite' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-rose)', animation: 'pulse 1s infinite' }}></div>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--accent-rose)' }}>🚨 Active Escalation — Caregiver Alerted</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{systemStatus.alertReason}</div>
              </div>
            </div>
          </div>
        )}

        {/* Caregiver Config Summary */}
        <div className="widget-glass" style={{ gridColumn: 'span 4' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Your Configuration</h3>
          {loadingCaregiver ? <p style={{ color: 'var(--text-muted)' }}>Loading...</p> : caregiver ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👤</div>
                <div>
                  <div style={{ fontWeight: '700' }}>{caregiver.name || 'Not configured'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{caregiver.relationship}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>📞 {caregiver.phone || '—'}</span>
                <span>✉️ {caregiver.email || '—'}</span>
                <span>⚠️ Alert after <strong style={{ color: '#fff' }}>{caregiver.alertThreshold}</strong> missed doses</span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No caregiver configured yet.</p>
          )}
        </div>

        {/* Alerts List */}
        <div className="widget-glass" style={{ gridColumn: 'span 8' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Recent Alerts {unreadCount > 0 && <span style={{ background: 'var(--accent-rose)', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{unreadCount} New</span>}
          </h3>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
              <p>No alerts at this time. The patient is doing well!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.map((alert) => (
                <div key={alert.id} onClick={() => handleMarkRead(alert.id)}
                  style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem', background: alert.read ? 'rgba(255,255,255,0.01)' : 'rgba(244,63,94,0.05)', border: `1px solid ${alert.read ? 'var(--border-glass)' : 'rgba(244,63,94,0.25)'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '1.5rem' }}>{alert.severity === 'Critical' ? '🚨' : '⚠️'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '700', color: alert.read ? '#fff' : 'var(--accent-rose)', fontSize: '0.95rem' }}>{alert.type} Alert</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(alert.timestamp)}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{alert.message}</p>
                    {!alert.read && <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>Click to mark as read</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
