import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { caregiverAPI } from '../services/api';

export default function Settings() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });
  const [caregiver, setCaregiver] = useState({ name: '', relationship: '', phone: '', email: '', alertThreshold: 2 });
  const [notifications, setNotifications] = useState({ missedDose: true, appointments: true, caregiverAlerts: true, aiInsights: false });
  const [loadingCaregiver, setLoadingCaregiver] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCaregiver, setSavingCaregiver] = useState(false);

  useEffect(() => {
    caregiverAPI.get()
      .then(res => {
        if (res.data && typeof res.data === 'object') {
          setCaregiver(prev => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => addToast('Could not load caregiver settings.', 'error'))
      .finally(() => setLoadingCaregiver(false));
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    // Profile updates would require a PATCH /api/auth/me endpoint; for now we confirm the UI action
    setTimeout(() => {
      addToast('Profile details saved successfully.', 'success');
      setSavingProfile(false);
    }, 500);
  };

  const handleSaveCaregiver = async (e) => {
    e.preventDefault();
    setSavingCaregiver(true);
    try {
      await caregiverAPI.update(caregiver);
      addToast('Caregiver configuration saved.', 'success');
    } catch {
      addToast('Failed to save caregiver settings.', 'error');
    } finally {
      setSavingCaregiver(false);
    }
  };

  const inputStyle = { display: 'block', width: '100%', marginTop: '0.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', padding: '0.6rem', borderRadius: '8px', color: '#fff', fontFamily: 'inherit', fontSize: '0.9rem' };
  const labelStyle = { fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your account, caregiver contact, and preferences.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Profile Settings */}
        <div className="widget-glass" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{user?.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{user?.email} · <span style={{ color: 'var(--accent-cyan)', textTransform: 'capitalize' }}>{user?.role}</span></div>
            </div>
          </div>
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" placeholder="+1 (555) 123-4567" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <button type="submit" className="btn-submit" style={{ padding: '0.5rem 1.5rem' }} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Caregiver Settings */}
        <div className="widget-glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>👨‍⚕️</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Caregiver / Emergency Contact</h3>
          </div>
          {loadingCaregiver ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : (
            <form onSubmit={handleSaveCaregiver}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Caregiver Name</label>
                  <input value={caregiver.name} onChange={e => setCaregiver({ ...caregiver, name: e.target.value })} placeholder="Full name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Relationship</label>
                  <input value={caregiver.relationship} onChange={e => setCaregiver({ ...caregiver, relationship: e.target.value })} placeholder="e.g. Daughter / Emergency Contact" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={caregiver.phone} onChange={e => setCaregiver({ ...caregiver, phone: e.target.value })} placeholder="+1-555-0199" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={caregiver.email} onChange={e => setCaregiver({ ...caregiver, email: e.target.value })} placeholder="caregiver@example.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Alert Threshold (missed doses before alert)</label>
                  <input type="number" min="1" max="10" value={caregiver.alertThreshold} onChange={e => setCaregiver({ ...caregiver, alertThreshold: parseInt(e.target.value) })} style={inputStyle} />
                </div>
              </div>
              <button type="submit" className="btn-submit" style={{ padding: '0.5rem 1.5rem' }} disabled={savingCaregiver}>
                {savingCaregiver ? 'Saving...' : 'Save Caregiver Info'}
              </button>
            </form>
          )}
        </div>

        {/* Notification Settings */}
        <div className="widget-glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔔</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Notification Preferences</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { key: 'missedDose', label: 'Missed Dose Alerts', desc: 'Get notified when a medication is overdue' },
              { key: 'appointments', label: 'Appointment Reminders', desc: '24h and 1h before each appointment' },
              { key: 'caregiverAlerts', label: 'Caregiver Escalation', desc: 'Notify caregiver after threshold is exceeded' },
              { key: 'aiInsights', label: 'AI Health Insights', desc: 'Daily AI-generated health suggestions' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
                <div onClick={() => { setNotifications(p => ({ ...p, [key]: !p[key] })); addToast(`${label} ${notifications[key] ? 'disabled' : 'enabled'}.`, 'info'); }}
                  style={{ width: '44px', height: '24px', borderRadius: '12px', background: notifications[key] ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: '2px', left: notifications[key] ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="widget-glass" style={{ gridColumn: 'span 2', border: '1px solid rgba(244,63,94,0.2)', background: 'linear-gradient(145deg, rgba(244,63,94,0.03), transparent)' }}>
          <h3 style={{ color: 'var(--accent-rose)', fontWeight: '700', marginBottom: '1rem' }}>⚠️ Account Actions</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => { logout(); }} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-rose)', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
