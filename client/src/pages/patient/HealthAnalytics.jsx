import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useToast } from '../../context/ToastContext';
import { medicationsAPI, historyAPI, statusAPI } from '../../services/api';

export default function HealthAnalytics() {
  const { addToast } = useToast();
  const [meds, setMeds] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([medicationsAPI.getAll(), historyAPI.getAll(), statusAPI.get()])
      .then(([medsRes, histRes, statusRes]) => {
        setMeds(medsRes.data);
        setHistory(histRes.data);
        setStatus(statusRes.data);
      })
      .catch(() => addToast('Could not load analytics data.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Build weekly chart data from medication schedules
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekData = days.map((day, idx) => {
    const dayMeds = meds.flatMap(m =>
      m.schedules.filter(s => {
        const d = new Date(s.takenAt || s.createdAt || Date.now());
        return d.getDay() === idx;
      })
    );
    const taken = dayMeds.filter(s => s.taken).length;
    const total = Math.max(dayMeds.length, 1);
    const score = Math.round((taken / total) * 100);
    return { day, score: dayMeds.length === 0 ? null : score, taken, total: dayMeds.length };
  });

  // If no schedule data, build from overall adherence
  const totalMeds = meds.length;
  const takenMeds = meds.filter(m => m.schedules.some(s => s.taken)).length;
  const adherence = totalMeds === 0 ? 100 : Math.round((takenMeds / totalMeds) * 100);
  const totalMissed = meds.reduce((sum, m) => sum + (m.missedCount || 0), 0);
  const healthScore = Math.max(40, adherence - totalMissed * 8);
  const riskLevel = healthScore >= 80 ? 'Low' : healthScore >= 60 ? 'Moderate' : 'High';
  const riskColor = riskLevel === 'Low' ? 'var(--accent-emerald)' : riskLevel === 'Moderate' ? 'var(--accent-amber)' : 'var(--accent-rose)';

  // Per-medication bar chart
  const medChartData = meds.map(m => ({
    name: m.name,
    Adherence: m.schedules.length === 0 ? 0 : Math.round((m.schedules.filter(s => s.taken).length / m.schedules.length) * 100),
    Missed: m.missedCount || 0,
  }));

  // Category breakdown from history
  const categories = history.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  const tooltipStyle = {
    contentStyle: { background: 'rgba(10,17,40,0.95)', border: '1px solid var(--border-glass)', borderRadius: '8px' },
    itemStyle: { color: '#fff' },
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Health Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time metrics from your medication and medical history data.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>⏳ Loading analytics...</div>
      ) : (
        <div className="widget-grid">

          {/* KPI Row */}
          {[
            { label: 'Health Score', value: `${healthScore}/100`, color: riskColor, icon: '❤️' },
            { label: 'Adherence Rate', value: `${adherence}%`, color: adherence >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)', icon: '💊' },
            { label: 'Total Missed Doses', value: totalMissed, color: totalMissed > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', icon: '⚠️' },
            { label: 'Medical Records', value: history.length, color: 'var(--accent-cyan)', icon: '📋' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="widget-glass" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
            </div>
          ))}

          {/* Medication Adherence Chart */}
          <div className="widget-glass" style={{ gridColumn: 'span 8' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
              Medication Adherence by Drug
            </h3>
            {medChartData.length === 0 ? (
              <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No medications configured yet.
              </div>
            ) : (
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={medChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} />
                    <Bar dataKey="Adherence" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Missed" fill="var(--accent-rose)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* AI Forecast Panel */}
          <div className="widget-glass" style={{ gridColumn: 'span 4', background: 'linear-gradient(145deg, rgba(37,99,235,0.05), rgba(10,17,40,0.8))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔮</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>AI Health Forecast</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Overall Risk Level</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: riskColor }}>{riskLevel} Risk</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Caregiver Alert</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: status?.caregiverAlerted ? 'var(--accent-rose)' : 'var(--accent-emerald)', flexShrink: 0 }} />
                  <span style={{ fontWeight: '600', fontSize: '0.9rem', color: status?.caregiverAlerted ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                    {status?.caregiverAlerted ? 'Active — Caregiver Notified' : 'No Active Alerts'}
                  </span>
                </div>
                {status?.alertReason && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{status.alertReason}</p>}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Recommendation</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {totalMissed === 0
                    ? '✅ Excellent adherence! Keep taking your medications on schedule.'
                    : `⚠️ You have missed ${totalMissed} dose${totalMissed !== 1 ? 's' : ''} recently. Consistency is key to your treatment plan.`}
                </p>
              </div>
            </div>
          </div>

          {/* Medical History by Category */}
          {Object.keys(categories).length > 0 && (
            <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>Medical History by Category</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {Object.entries(categories).map(([cat, count]) => (
                  <div key={cat} style={{ padding: '0.75rem 1.25rem', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{cat}</span>
                    <span style={{ background: 'rgba(0,229,255,0.12)', color: 'var(--accent-cyan)', padding: '0.1rem 0.5rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>{count} record{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Records List */}
          {history.length > 0 && (
            <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>Recent Medical Records</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {history.slice(0, 5).map((r) => (
                  <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontWeight: '600' }}>{r.title}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>· {r.category}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.date ? new Date(r.date).toLocaleDateString() : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
