import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { medicationsAPI, appointmentsAPI, statusAPI, activityAPI } from '../services/api';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [medications, setMedications] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [medsRes, apptRes, statusRes, activitiesRes, statsRes] = await Promise.all([
          medicationsAPI.getAll(),
          appointmentsAPI.getAll(),
          statusAPI.get(),
          activityAPI.getAll(),
          activityAPI.getStats(),
        ]);
        setMedications(medsRes.data);
        setAppointments(apptRes.data.filter(a => a.status === 'Scheduled'));
        setSystemStatus(statusRes.data);
        setActivities(activitiesRes.data || []);
        setStats(statsRes.data);
      } catch {
        addToast('Could not load dashboard data. Is the server running?', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleTakeMed = async (med) => {
    const pendingSchedule = med.schedules.find(s => !s.taken);
    if (!pendingSchedule) { addToast('All doses already taken.', 'info'); return; }
    try {
      await medicationsAPI.take(med._id, pendingSchedule.time);
      setMedications(prev => prev.map(m =>
        m._id === med._id
          ? { ...m, schedules: m.schedules.map(s => s.time === pendingSchedule.time ? { ...s, taken: true } : s) }
          : m
      ));
      addToast(`${med.name} marked as taken.`, 'success');
    } catch {
      addToast('Failed to mark medication as taken.', 'error');
    }
  };

  const handleDismissAlert = async () => {
    try {
      await statusAPI.reset();
      setSystemStatus(prev => ({ ...prev, caregiverAlerted: false }));
      addToast('Alert acknowledged and cleared.', 'success');
    } catch {
      addToast('Failed to dismiss alert.', 'error');
    }
  };

  // Computed stats
  const totalMeds = medications.length;
  const takenMeds = medications.filter(m => m.schedules.some(s => s.taken)).length;
  const missedMeds = medications.filter(m => m.missedCount > 0);
  const adherence = totalMeds === 0 ? 100 : Math.round((takenMeds / totalMeds) * 100);
  const healthScore = Math.max(40, adherence - (missedMeds.length * 5));
  const riskLevel = healthScore >= 80 ? 'Low' : healthScore >= 60 ? 'Moderate' : 'High';
  const riskColor = riskLevel === 'Low' ? 'var(--accent-emerald)' : riskLevel === 'Moderate' ? 'var(--accent-amber)' : 'var(--accent-rose)';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dt) => {
    try { return new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
    catch { return dt; }
  };

  const aiInsights = [
    takenMeds < totalMeds ? `⚠️ You have ${totalMeds - takenMeds} pending medication(s) today.` : '✅ All medications taken for today. Excellent adherence!',
    missedMeds.length > 0 ? `⚠️ ${missedMeds.map(m => m.name).join(', ')} have missed doses this week.` : '✅ No missed doses this week. Keep it up!',
    appointments.length > 0 ? `📅 Upcoming: Dr. ${appointments[0].provider} on ${formatDate(appointments[0].dateTime)}.` : '💡 No upcoming appointments. Consider a regular check-up.',
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.25rem' }}>
            {getGreeting()}, {user?.name || 'Patient'} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Here is your live health overview for today.</p>
        </div>
        <button className="btn-submit" style={{ padding: '0.6rem 1.2rem', borderRadius: '20px' }}
          onClick={() => navigate('/patient/medications')}>
          Manage Medications
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Loading your health dashboard...</p>
        </div>
      ) : (
        <div className="widget-grid">

          {/* 1. Health Score */}
          <div className="widget-glass" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Health Score</h3>
            <div style={{ position: 'relative', width: '140px', height: '140px', borderRadius: '50%', background: `conic-gradient(var(--accent-cyan) ${healthScore}%, rgba(255,255,255,0.05) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-cyan)' }}>
              <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: '1' }}>{healthScore}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk Level</div>
                <div style={{ fontWeight: '700', color: riskColor }}>{riskLevel}</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border-glass)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adherence</div>
                <div style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{adherence}%</div>
              </div>
            </div>
          </div>

          {/* 2. Medications Today */}
          <div className="widget-glass" style={{ gridColumn: 'span 4' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medications Today</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', background: 'rgba(0,229,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>{takenMeds}/{totalMeds} Taken</span>
            </div>
            {medications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No medications configured. <span style={{ color: 'var(--accent-cyan)', cursor: 'pointer' }} onClick={() => navigate('/patient/medications')}>Add one →</span></p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {medications.slice(0, 4).map((med) => {
                  const allTaken = med.schedules.every(s => s.taken);
                  return (
                    <div key={med._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: allTaken ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}></div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{med.name} {med.dosage}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{med.schedules.map(s => s.time).join(', ')}</div>
                        </div>
                      </div>
                      {!allTaken ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleTakeMed(med)} style={{ background: 'var(--accent-emerald)', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>✓ Take</button>
                          <button onClick={() => addToast(`Reminder snoozed for ${med.name}.`, 'info')} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Snooze</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>✓ Taken</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Activity Tracking — Live Stats */}
          <div className="widget-glass" style={{ gridColumn: 'span 4' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Activity Tracking</h3>
            {stats ? (
              <>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>🔥</div>
                    <div style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{stats.totalCalories} kcal</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>⏱️</div>
                    <div style={{ fontWeight: '700', color: 'var(--accent-emerald)' }}>{stats.totalMinutes} min</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>🏆</div>
                    <div style={{ fontWeight: '700', color: 'var(--accent-amber)' }}>{stats.streak} Days</div>
                  </div>
                </div>
                <button className="btn-submit" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} onClick={() => navigate('/patient/activity')}>
                  View Detailed Tracking →
                </button>
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading stats...</p>
            )}
          </div>

          {/* 4. AI Health Insights */}
          <div className="widget-glass" style={{ gridColumn: 'span 6', background: 'linear-gradient(145deg, rgba(20,184,166,0.05), rgba(10,17,40,0.8))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🧠</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>AI Health Insights</h3>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {aiInsights.map((insight, idx) => (
                <li key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-teal)', marginTop: '2px' }}>✦</span>
                  {insight}
                </li>
              ))}
            </ul>
            <button className="btn-submit" style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={() => navigate('/patient/chat')}>
              Ask AI Assistant →
            </button>
          </div>

          {/* 5. Upcoming Appointment */}
          <div className="widget-glass" style={{ gridColumn: 'span 6' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Upcoming Appointment</h3>
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                <p>No upcoming appointments.</p>
                <button className="btn-submit" style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => navigate('/patient/appointments')}>Book One →</button>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '0.2rem' }}>Dr. {appointments[0].provider}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{appointments[0].specialty}</div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                    <span>📅 {formatDate(appointments[0].dateTime)}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{appointments[0].purpose}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button onClick={() => navigate('/patient/appointments')} className="btn-submit" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>View Details</button>
                </div>
              </div>
            )}
          </div>

          {/* 6. Emergency Alert Panel - only shown if caregiver has been alerted */}
          {systemStatus?.caregiverAlerted && (
            <div className="widget-glass" style={{ gridColumn: 'span 12', border: '1px solid rgba(244,63,94,0.3)', background: 'linear-gradient(90deg, rgba(244,63,94,0.05), transparent)' }}>
              <div className="flex-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(244,63,94,0.2)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚠️</div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>Caregiver Escalation Active</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{systemStatus.alertReason}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => navigate('/patient/notifications')}
                    style={{ background: 'var(--accent-rose)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                    Review Alerts
                  </button>
                  <button onClick={handleDismissAlert}
                    style={{ background: 'transparent', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-rose)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
