import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { medicationsAPI, appointmentsAPI, historyAPI, statusAPI } from '../services/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      medicationsAPI.getAll(),
      appointmentsAPI.getAll(),
      historyAPI.getAll(),
      statusAPI.get(),
    ])
      .then(([medsRes, apptRes, histRes, statusRes]) => {
        const meds = medsRes.data;
        const appts = apptRes.data;
        const history = histRes.data;
        const status = statusRes.data;
        const takenMeds = meds.filter(m => m.schedules.some(s => s.taken)).length;
        const adherence = meds.length === 0 ? 100 : Math.round((takenMeds / meds.length) * 100);
        const totalMissed = meds.reduce((sum, m) => sum + (m.missedCount || 0), 0);
        setData({ meds, appts, history, status, adherence, totalMissed });
      })
      .catch(() => addToast('Could not load admin data. Is the server running?', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadReport = () => {
    if (!data) return;
    const report = {
      generatedAt: new Date().toISOString(),
      medications: data.meds.map(m => ({ name: m.name, dosage: m.dosage, missedCount: m.missedCount, adherence: `${Math.round((m.schedules.filter(s => s.taken).length / m.schedules.length) * 100)}%` })),
      appointments: data.appts.map(a => ({ provider: a.provider, dateTime: a.dateTime, status: a.status })),
      medicalHistory: data.history.map(h => ({ title: h.title, category: h.category, date: h.date })),
      systemStatus: data.status,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('System report downloaded.', 'success');
  };

  const analytics = data ? [
    { title: 'Medications', value: data.meds.length, icon: '💊', color: 'var(--accent-cyan)', trend: null },
    { title: 'Adherence Rate', value: `${data.adherence}%`, icon: '📊', color: data.adherence >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)', trend: null },
    { title: 'Missed Doses', value: data.totalMissed, icon: '⚠️', color: data.totalMissed > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', trend: null },
    { title: 'Medical Records', value: data.history.length, icon: '📋', color: 'var(--accent-blue)', trend: null },
    { title: 'Appointments', value: data.appts.length, icon: '📅', color: 'var(--accent-purple)', trend: null },
    { title: 'Alert Status', value: data.status?.caregiverAlerted ? 'ACTIVE' : 'Clear', icon: '🔔', color: data.status?.caregiverAlerted ? 'var(--accent-rose)' : 'var(--accent-emerald)', trend: null },
  ] : [];

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>System analytics, AI monitoring, and patient management.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-submit" style={{ padding: '0.6rem 1.2rem', borderRadius: '20px' }}
            onClick={handleDownloadReport} disabled={!data}>
            ⬇ Download Report
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>⏳ Loading system data...</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔌</div>
          <p>Could not connect to the backend. Please ensure the API server is running on port 5000.</p>
        </div>
      ) : (
        <div className="widget-grid">

          {/* KPI Cards */}
          {analytics.map((stat) => (
            <div key={stat.title} className="widget-glass" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>{stat.title}</div>
                <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: stat.color }}>{stat.value}</div>
            </div>
          ))}

          {/* Active Alert Banner */}
          {data.status?.caregiverAlerted && (
            <div className="widget-glass" style={{ gridColumn: 'span 12', border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.05)' }}>
              <div className="flex-between">
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.75rem' }}>🚨</span>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--accent-rose)' }}>Caregiver Alert Active</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{data.status.alertReason}</div>
                  </div>
                </div>
                <button className="btn-submit" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => navigate('/admin/monitor')}>
                  View AI Monitor →
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="widget-glass" style={{ gridColumn: 'span 12', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ width: '100%', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Quick Actions</h3>
            {[
              { label: '👥 User Management', desc: 'Assign patients to caregivers', path: '/admin/users', color: 'var(--accent-teal)' },
              { label: '📊 Analytics', desc: 'Medication adherence charts', path: '/admin/analytics', color: 'var(--accent-cyan)' },
              { label: '🤖 AI Monitor', desc: 'Query the Gemini AI engine', path: '/admin/ai-monitor', color: 'var(--accent-purple)' },
            ].map(({ label, desc, path, color }) => (
              <div key={path} onClick={() => navigate(path)} className="widget-glass"
                style={{ flex: '1', minWidth: '200px', cursor: 'pointer', border: `1px solid ${color}22`, background: `${color}08`, transition: 'all 0.2s', padding: '1rem' }}
                onMouseEnter={e => e.currentTarget.style.background = `${color}14`}
                onMouseLeave={e => e.currentTarget.style.background = `${color}08`}>
                <div style={{ fontWeight: '700', color, marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Medication Management Table */}
          <div className="widget-glass" style={{ gridColumn: 'span 8' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medication Overview</h3>
              <button onClick={() => navigate('/admin/analytics')} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.85rem' }}>View Analytics →</button>
            </div>
            {data.meds.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No medications in the database.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    {['Medication', 'Dosage', 'Frequency', 'Taken Today', 'Missed Count'].map(h => (
                      <th key={h} style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.meds.map((med) => {
                    const takenToday = med.schedules.filter(s => s.taken).length;
                    return (
                      <tr key={med._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>{med.name}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{med.dosage}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{med.frequency}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ background: takenToday === med.schedules.length ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: takenToday === med.schedules.length ? 'var(--accent-emerald)' : 'var(--accent-amber)', padding: '0.15rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
                            {takenToday}/{med.schedules.length}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: med.missedCount > 0 ? 'var(--accent-rose)' : 'var(--text-muted)', fontWeight: med.missedCount > 0 ? '700' : '400' }}>{med.missedCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* AI Monitoring Summary */}
          <div className="widget-glass" style={{ gridColumn: 'span 4', background: 'linear-gradient(145deg, rgba(147,51,234,0.05), rgba(10,17,40,0.8))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>AI Engine Status</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Model', value: 'Gemini 1.5 Flash', color: 'var(--accent-cyan)' },
                { label: 'Database', value: 'MongoDB Connected', color: 'var(--accent-emerald)' },
                { label: 'Realtime', value: 'Socket.IO Active', color: 'var(--accent-teal)' },
                { label: 'Alert Engine', value: data.status?.caregiverAlerted ? '🚨 Active' : '✅ Standby', color: data.status?.caregiverAlerted ? 'var(--accent-rose)' : 'var(--accent-emerald)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color }}>{value}</span>
                </div>
              ))}
              <button className="btn-submit" style={{ marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => navigate('/admin/monitor')}>
                Open AI Console →
              </button>
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Appointments</h3>
            </div>
            {data.appts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No appointments on record.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.appts.map((a) => (
                  <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontWeight: '600' }}>Dr. {a.provider}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}> · {a.specialty} · {a.purpose}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(a.dateTime).toLocaleDateString()}</span>
                      <span style={{ background: a.status === 'Scheduled' ? 'rgba(0,229,255,0.1)' : 'rgba(16,185,129,0.1)', color: a.status === 'Scheduled' ? 'var(--accent-cyan)' : 'var(--accent-emerald)', padding: '0.15rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {a.status}
                      </span>
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
