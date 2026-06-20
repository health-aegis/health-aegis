import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { medicationsAPI, appointmentsAPI, historyAPI, statusAPI } from '../../services/api';

export default function PatientsList() {
  const { addToast } = useToast();
  const [medications, setMedications] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      medicationsAPI.getAll(),
      appointmentsAPI.getAll(),
      historyAPI.getAll(),
      statusAPI.get(),
    ])
      .then(([medsRes, apptRes, recordsRes, statusRes]) => {
        setMedications(medsRes.data);
        setAppointments(apptRes.data);
        setRecords(recordsRes.data);
        setSystemStatus(statusRes.data);
      })
      .catch(() => addToast('Failed to load patient data.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const takenMeds = medications.filter(m => m.schedules.some(s => s.taken)).length;
  const missedMeds = medications.filter(m => m.missedCount > 0);
  const adherence = medications.length === 0 ? 100 : Math.round((takenMeds / medications.length) * 100);
  const upcomingAppts = appointments.filter(a => a.status === 'Scheduled');

  const formatDate = (dt) => {
    try { return new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
    catch { return dt; }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Patient Overview</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Monitor the patient's live health data, medications, and appointments.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>⏳ Loading patient data...</div>
      ) : (
        <div className="widget-grid">
          {/* Summary Stats */}
          {[
            { label: 'Active Medications', value: medications.length, icon: '💊', color: 'var(--accent-cyan)' },
            { label: 'Adherence Today', value: `${adherence}%`, icon: '📊', color: adherence >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' },
            { label: 'Missed Doses', value: missedMeds.length, icon: '⚠️', color: missedMeds.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' },
            { label: 'Upcoming Appointments', value: upcomingAppts.length, icon: '📅', color: 'var(--accent-purple)' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="widget-glass" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color, lineHeight: '1' }}>{value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
            </div>
          ))}

          {/* Alert Status */}
          {systemStatus?.caregiverAlerted && (
            <div className="widget-glass" style={{ gridColumn: 'span 12', border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>🚨</span>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--accent-rose)', fontSize: '1.05rem' }}>Caregiver Alert Active</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{systemStatus.alertReason}</div>
                </div>
              </div>
            </div>
          )}

          {/* Medications Status */}
          <div className="widget-glass" style={{ gridColumn: 'span 6' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Medication Schedule</h3>
            {medications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No medications configured.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {medications.map((med) => {
                  const allTaken = med.schedules.every(s => s.taken);
                  return (
                    <div key={med._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{med.name} <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>{med.dosage}</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{med.frequency} · {med.schedules.map(s => s.time).join(', ')}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {med.missedCount > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: '600' }}>{med.missedCount}x missed</span>}
                        <span style={{ background: allTaken ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: allTaken ? 'var(--accent-emerald)' : 'var(--accent-amber)', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '600' }}>
                          {allTaken ? '✓ Taken' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="widget-glass" style={{ gridColumn: 'span 6' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Upcoming Appointments</h3>
            {upcomingAppts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No upcoming appointments.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingAppts.map((a) => (
                  <div key={a._id} style={{ padding: '1rem', background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: '700' }}>Dr. {a.provider}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{a.specialty}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{a.purpose}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>📅 {formatDate(a.dateTime)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Medical History */}
          <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Medical History ({records.length} records)</h3>
            {records.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No medical records.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {records.slice(0, 5).map((r) => (
                  <div key={r._id} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <span style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--accent-cyan)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{r.category}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{r.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.description}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.date}</div>
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
