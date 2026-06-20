import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function HealthScore({ medications, history }) {
  // Calculate a mock score based on missed medications
  const totalMeds = medications.length;
  const missedMeds = medications.reduce((acc, med) => acc + (med.missedCount || 0), 0);
  const penalty = Math.min(missedMeds * 5, 40);
  const score = Math.max(100 - penalty, 0);

  // Determine color based on score
  let color = 'var(--accent-emerald)';
  let glow = 'var(--glow-emerald)';
  let status = 'Excellent';
  if (score < 80) { color = 'var(--accent-amber)'; glow = '0 0 20px rgba(245, 158, 11, 0.3)'; status = 'Needs Attention'; }
  if (score < 60) { color = 'var(--accent-rose)'; glow = 'var(--glow-rose)'; status = 'Critical'; }

  // Mock adherence trend data over the last 7 days
  const data = [
    { day: 'Mon', score: score > 90 ? 98 : score + 10 },
    { day: 'Tue', score: score > 90 ? 95 : score + 8 },
    { day: 'Wed', score: score > 90 ? 100 : score + 12 },
    { day: 'Thu', score: score > 90 ? 92 : score - 5 },
    { day: 'Fri', score: score > 90 ? 96 : score + 5 },
    { day: 'Sat', score: score > 90 ? 90 : score - 2 },
    { day: 'Sun', score: score },
  ];

  return (
    <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      
      {/* Circular Progress Score */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '150px' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Overall Health Score</h3>
        <div style={{
          position: 'relative', width: '120px', height: '120px', borderRadius: '50%',
          background: `conic-gradient(${color} ${score}%, rgba(255,255,255,0.05) 0)`,
          boxShadow: glow,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.5s ease-out'
        }}>
          <div style={{
            position: 'absolute', width: '100px', height: '100px', borderRadius: '50%',
            background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', lineHeight: '1' }}>{score}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>
        <div style={{ marginTop: '1rem', fontWeight: '600', color }}>{status}</div>
      </div>

      {/* Recharts Adherence Trend */}
      <div style={{ flexGrow: 1, minWidth: '300px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>7-Day Adherence Trend</h3>
        </div>
        <div style={{ height: '160px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke={color} 
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--bg-primary)', stroke: color, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: color, stroke: '#fff' }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );
}

export default HealthScore;
