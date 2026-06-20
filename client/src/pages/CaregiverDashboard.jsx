import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { medicationsAPI, statusAPI, caregiverAPI, adminAPI } from '../services/api';

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [medications, setMedications] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [caregiver, setCaregiver] = useState(null);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [medsRes, statusRes, cgRes] = await Promise.all([
          medicationsAPI.getAll(),
          statusAPI.get(),
          caregiverAPI.get(),
        ]);
        setMedications(medsRes.data);
        setSystemStatus(statusRes.data);
        setCaregiver(cgRes.data);
        if (statusRes.data?.caregiverAlerted) {
          setAlerts([{
            id: 'active-alert',
            type: 'Medication',
            severity: 'Critical',
            message: statusRes.data.alertReason || 'Patient exceeded missed dose threshold.',
            time: statusRes.data.lastNotificationSent ? new Date(statusRes.data.lastNotificationSent).toLocaleTimeString() : 'Recently',
          }]);
        }
        // Fetch assigned patients for this caregiver
        const caregiverId = user?._id || user?.id;
        if (caregiverId) {
          const patientsRes = await adminAPI.getMyPatients(caregiverId);
          setAssignedPatients(patientsRes.data);
        }
      } catch {
        addToast('Could not load caregiver data.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Real-time socket alerts
  useEffect(() => {
    if (!socket) return;
    const handler = (newAlert) => {
      setAlerts(prev => [{
        id: Date.now(),
        type: newAlert.type || 'System Alert',
        message: newAlert.message,
        severity: newAlert.severity || 'High',
        time: 'Just now',
      }, ...prev]);
      addToast(`🚨 ${newAlert.message}`, 'error');
    };
    socket.on('alert', handler);
    return () => socket.off('alert', handler);
  }, [socket]);

  const handleAcknowledge = async (id) => {
    try {
      await statusAPI.reset();
      setAlerts(prev => prev.filter(a => a.id !== id));
      setSystemStatus(prev => prev ? { ...prev, caregiverAlerted: false } : prev);
      addToast('Alert acknowledged and cleared.', 'success');
    } catch {
      addToast('Failed to clear alert.', 'error');
    }
  };

  const takenMeds = medications.filter(m => m.schedules.some(s => s.taken)).length;
  const adherence = medications.length === 0 ? 100 : Math.round((takenMeds / medications.length) * 100);
  const missedCount = medications.reduce((sum, m) => sum + (m.missedCount || 0), 0);
  const healthScore = Math.max(40, adherence - (missedCount * 8));
  const riskLevel = healthScore >= 80 ? 'Stable' : healthScore >= 60 ? 'Moderate' : 'Critical';
  const riskColor = riskLevel === 'Stable' ? 'var(--accent-emerald)' : riskLevel === 'Moderate' ? 'var(--accent-amber)' : 'var(--accent-rose)';

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Caregiver Portal</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor your linked patients and respond to critical alerts.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-submit" style={{ padding: '0.6rem 1.2rem', borderRadius: '20px' }}
            onClick={() => navigate('/caregiver/patients')}>
            Full Patient View →
          </button>
          {alerts.length > 0 && (
            <button style={{ background: 'var(--accent-rose)', border: 'none', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '20px', fontWeight: '700', cursor: 'pointer' }}
              onClick={() => addToast('Emergency dispatch request sent.', 'error')}>
              🚨 Emergency Dispatch
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>⏳ Loading patient data...</div>
      ) : (
        <div className="widget-grid">
          {/* Patient Health Summary */}
          <div className="widget-glass" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👤</div>
            <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '0.25rem' }}>Patient Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
              {[
                { label: 'Health Score', value: `${healthScore}/100`, color: riskColor },
                { label: 'Risk Level', value: riskLevel, color: riskColor },
                { label: 'Adherence', value: `${adherence}%`, color: 'var(--accent-cyan)' },
                { label: 'Active Meds', value: medications.length, color: 'var(--text-secondary)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="widget-glass" style={{ gridColumn: 'span 8' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Alerts {alerts.length > 0 && <span style={{ background: 'var(--accent-rose)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '8px', fontSize: '0.7rem', marginLeft: '0.5rem' }}>{alerts.length}</span>}
              </h3>
              <button onClick={() => navigate('/caregiver/alerts')} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.85rem', cursor: 'pointer' }}>View All →</button>
            </div>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <p>No active alerts. Patient is doing well!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.map((alert) => (
                  <div key={alert.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem' }}>🚨</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '700', color: 'var(--accent-rose)', fontSize: '0.9rem' }}>{alert.type} Alert — {alert.severity}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alert.time}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{alert.message}</p>
                    </div>
                    <button onClick={() => handleAcknowledge(alert.id)}
                      style={{ background: 'transparent', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-rose)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medication Overview */}
          <div className="widget-glass" style={{ gridColumn: 'span 6' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Patient Medication Status</h3>
            {medications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No medications configured yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {medications.map((med) => {
                  const allTaken = med.schedules.every(s => s.taken);
                  return (
                    <div key={med._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{med.name} {med.dosage}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{med.schedules.map(s => s.time).join(', ')}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {med.missedCount > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--accent-rose)' }}>{med.missedCount}x missed</span>}
                        <span style={{ background: allTaken ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: allTaken ? 'var(--accent-emerald)' : 'var(--accent-amber)', padding: '0.15rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
                          {allTaken ? '✓ Taken' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Caregiver Config */}
          <div className="widget-glass" style={{ gridColumn: 'span 6' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Your Caregiver Profile</h3>
            {caregiver?.name ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>👨‍⚕️</div>
                  <div>
                    <div style={{ fontWeight: '700' }}>{caregiver.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{caregiver.relationship}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span>📞 {caregiver.phone || '—'}</span>
                  <span>✉️ {caregiver.email || '—'}</span>
                  <span style={{ color: 'var(--accent-amber)' }}>⚠️ Alert threshold: <strong>{caregiver.alertThreshold}</strong> missed doses</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: '1rem' }}>Caregiver profile not configured.</p>
                <button className="btn-submit" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => navigate('/caregiver/settings')}>Configure Profile →</button>
              </div>
            )}
          </div>
          {/* Assigned Patients — populated by admin assignment */}
          <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
            <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏥</span>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Your Assigned Patients</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Managed by admin via User Management</p>
                </div>
              </div>
              <span style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--accent-cyan)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700' }}>
                {assignedPatients.length} Patient{assignedPatients.length !== 1 ? 's' : ''}
              </span>
            </div>
            {assignedPatients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border-glass)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No patients assigned to you yet.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>An admin can assign patients via <strong style={{ color: 'var(--accent-cyan)' }}>Admin → User Management</strong>.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {assignedPatients.map((patient) => (
                  <div key={patient._id} style={{ padding: '1rem', background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '10px', transition: 'border 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(0,229,255,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.border = '1px solid rgba(0,229,255,0.12)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', flexShrink: 0 }}>
                        {patient.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{patient.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{patient.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                      <span>Since {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</span>
                      <span style={{ color: 'var(--accent-cyan)', background: 'rgba(0,229,255,0.08)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>Patient</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
