import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { medicationsAPI, appointmentsAPI, statusAPI } from '../../services/api';

export default function Notifications() {
  const { addToast } = useToast();
  const socket = useSocket();
  const [filterUnread, setFilterUnread] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([medicationsAPI.getAll(), appointmentsAPI.getAll(), statusAPI.get()])
      .then(([medsRes, apptRes, statusRes]) => {
        const built = [];

        // Medication-based notifications
        medsRes.data.forEach(med => {
          if (med.missedCount > 0) {
            built.push({
              id: `missed-${med._id}`,
              type: 'Medication',
              title: 'Missed Dose',
              desc: `You missed ${med.missedCount} consecutive dose${med.missedCount !== 1 ? 's' : ''} of ${med.name} ${med.dosage}.`,
              time: 'Recent',
              severity: med.missedCount >= 3 ? 'Critical' : 'High',
              read: false,
            });
          }
          const allTaken = med.schedules.every(s => s.taken);
          if (allTaken && med.schedules.length > 0) {
            built.push({
              id: `taken-${med._id}`,
              type: 'Medication',
              title: 'Doses Completed',
              desc: `All scheduled doses of ${med.name} ${med.dosage} have been taken today.`,
              time: 'Today',
              severity: 'Low',
              read: true,
            });
          }
        });

        // Caregiver alert notification
        if (statusRes.data?.caregiverAlerted) {
          built.unshift({
            id: 'caregiver-alert',
            type: 'Alert',
            title: 'Caregiver Notified',
            desc: statusRes.data.alertReason || 'Your caregiver has been alerted about missed medications.',
            time: statusRes.data.lastNotificationSent ? new Date(statusRes.data.lastNotificationSent).toLocaleTimeString() : 'Recently',
            severity: 'Critical',
            read: false,
          });
        }

        // Upcoming appointment reminders
        apptRes.data
          .filter(a => a.status === 'Scheduled')
          .forEach(a => {
            const apptDate = new Date(a.dateTime);
            const now = new Date();
            const diffDays = Math.ceil((apptDate - now) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 7) {
              built.push({
                id: `appt-${a._id}`,
                type: 'Appointment',
                title: diffDays === 0 ? 'Appointment Today!' : `Appointment in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
                desc: `${a.purpose} with Dr. ${a.provider} · ${apptDate.toLocaleDateString()} at ${apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                time: diffDays === 0 ? 'Today' : `${diffDays}d away`,
                severity: diffDays <= 1 ? 'High' : 'Medium',
                read: diffDays > 3,
              });
            }
          });

        // Sort: unread first, then by severity
        const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        built.sort((a, b) => {
          if (a.read !== b.read) return a.read ? 1 : -1;
          return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
        });

        setNotifications(built);
      })
      .catch(() => addToast('Could not load notifications.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Live socket alerts
  useEffect(() => {
    if (!socket) return;
    const handler = (alert) => {
      setNotifications(prev => [{
        id: `live-${Date.now()}`,
        type: 'System Alert',
        title: alert.type || 'New Alert',
        desc: alert.message,
        time: 'Just now',
        severity: alert.severity || 'High',
        read: false,
      }, ...prev]);
      addToast(`🔔 ${alert.message}`, 'error');
    };
    socket.on('alert', handler);
    return () => socket.off('alert', handler);
  }, [socket]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast('All notifications marked as read.', 'success');
  };

  const handleDismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const displayed = filterUnread ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const severityColor = (s) => {
    if (s === 'Critical') return 'var(--accent-rose)';
    if (s === 'High') return 'var(--accent-amber)';
    if (s === 'Medium') return 'var(--accent-blue)';
    return 'var(--accent-cyan)';
  };

  const typeIcon = (t) => {
    if (t === 'Medication') return '💊';
    if (t === 'Alert') return '🚨';
    if (t === 'Appointment') return '📅';
    if (t === 'System Alert') return '⚡';
    return '🔔';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Real-time alerts from your medications, appointments, and AI system.
            {unreadCount > 0 && <span style={{ color: 'var(--accent-rose)', fontWeight: '700' }}> · {unreadCount} unread</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setFilterUnread(v => !v)}
            style={{ background: filterUnread ? 'rgba(0,229,255,0.1)' : 'transparent', border: '1px solid var(--border-glass)', color: filterUnread ? 'var(--accent-cyan)' : 'var(--text-secondary)', padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer', fontWeight: '600' }}>
            {filterUnread ? 'Show All' : `Unread (${unreadCount})`}
          </button>
          <button onClick={handleMarkAllRead} className="btn-submit" style={{ padding: '0.4rem 1rem', borderRadius: '20px' }}>
            ✓ Mark All Read
          </button>
        </div>
      </div>

      <div className="widget-glass">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>⏳ Loading notifications...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: 'var(--text-muted)' }}>{filterUnread ? 'No unread notifications.' : 'No notifications. Everything is on track!'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {displayed.map((n) => (
              <div key={n.id} style={{
                display: 'flex', gap: '1rem', padding: '1.1rem 1.25rem',
                background: n.read ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-glass)',
                borderLeft: `3px solid ${severityColor(n.severity)}`,
                borderRadius: '8px', alignItems: 'center', transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{typeIcon(n.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: severityColor(n.severity) }}>{n.type}</span>
                    {!n.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: n.read ? 'var(--text-secondary)' : '#fff', marginBottom: '0.2rem' }}>{n.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{n.desc}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.time}</span>
                  <button onClick={() => handleDismiss(n.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
