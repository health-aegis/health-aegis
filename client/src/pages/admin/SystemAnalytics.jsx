import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { medicationsAPI, appointmentsAPI, historyAPI, statusAPI } from '../../services/api';

export default function SystemAnalytics() {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
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

        setStats({
          totalMedications: meds.length,
          adherenceRate: adherence,
          totalMissedDoses: totalMissed,
          scheduledAppointments: appts.filter(a => a.status === 'Scheduled').length,
          completedAppointments: appts.filter(a => a.status !== 'Scheduled').length,
          medicalRecords: history.length,
          caregiverAlerted: status?.caregiverAlerted || false,
          alertReason: status?.alertReason,
          meds,
          categoryBreakdown: history.reduce((acc, r) => {
            acc[r.category] = (acc[r.category] || 0) + 1;
            return acc;
          }, {}),
        });
      })
      .catch(() => addToast('Failed to load analytics data.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const barColor = (pct) => {
    if (pct >= 80) return 'var(--accent-emerald)';
    if (pct >= 50) return 'var(--accent-amber)';
    return 'var(--accent-rose)';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>System Analytics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Live data aggregated from MongoDB — medications, appointments, and records.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>⏳ Loading analytics...</div>
      ) : !stats ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Could not load data. Is the backend running?</div>
      ) : (
        <div className="widget-grid">
          {/* KPI Cards */}
          {[
            { label: 'Medications', value: stats.totalMedications, icon: '💊', color: 'var(--accent-cyan)' },
            { label: 'Adherence Rate', value: `${stats.adherenceRate}%`, icon: '📊', color: barColor(stats.adherenceRate) },
            { label: 'Total Missed Doses', value: stats.totalMissedDoses, icon: '⚠️', color: stats.totalMissedDoses > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' },
            { label: 'Scheduled Appts', value: stats.scheduledAppointments, icon: '📅', color: 'var(--accent-purple)' },
            { label: 'Completed Appts', value: stats.completedAppointments, icon: '✅', color: 'var(--accent-teal)' },
            { label: 'Medical Records', value: stats.medicalRecords, icon: '📋', color: 'var(--accent-blue)' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="widget-glass" style={{ gridColumn: 'span 4', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color, lineHeight: '1' }}>{value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
            </div>
          ))}

          {/* Alert Status Banner */}
          {stats.caregiverAlerted && (
            <div className="widget-glass" style={{ gridColumn: 'span 12', border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>🚨</span>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--accent-rose)' }}>Active Caregiver Alert</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{stats.alertReason}</div>
                </div>
              </div>
            </div>
          )}

          {/* Per-Medication Adherence Bar Chart */}
          <div className="widget-glass" style={{ gridColumn: 'span 8' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Medication Adherence Breakdown</h3>
            {stats.meds.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No medications configured.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats.meds.map((med) => {
                  const takenCount = med.schedules.filter(s => s.taken).length;
                  const totalCount = med.schedules.length;
                  const pct = totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100);
                  return (
                    <div key={med._id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: '600' }}>{med.name} <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>{med.dosage}</span></span>
                        <span style={{ color: barColor(pct), fontWeight: '700' }}>{pct}% · {takenCount}/{totalCount} taken</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: barColor(pct), borderRadius: '4px', transition: 'width 0.8s ease' }} />
                      </div>
                      {med.missedCount > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', marginTop: '0.25rem' }}>⚠️ {med.missedCount} consecutive missed doses</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Medical History Categories */}
          <div className="widget-glass" style={{ gridColumn: 'span 4' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Records by Category</h3>
            {Object.keys(stats.categoryBreakdown).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No records found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(stats.categoryBreakdown).map(([cat, count]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{cat}</span>
                    <span style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--accent-cyan)', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700' }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Health */}
          <div className="widget-glass" style={{ gridColumn: 'span 12', background: 'linear-gradient(145deg, rgba(16,185,129,0.05), rgba(10,17,40,0.8))' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>System Health Status</h3>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[
                { label: 'API Gateway', status: 'Online', color: 'var(--accent-emerald)' },
                { label: 'MongoDB', status: 'Connected', color: 'var(--accent-emerald)' },
                { label: 'Socket.IO', status: 'Active', color: 'var(--accent-emerald)' },
                { label: 'Gemini AI', status: 'Connected', color: 'var(--accent-cyan)' },
                { label: 'Alert System', status: stats.caregiverAlerted ? 'Alert Active' : 'Standby', color: stats.caregiverAlerted ? 'var(--accent-rose)' : 'var(--accent-emerald)' },
              ].map(({ label, status, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color }}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
