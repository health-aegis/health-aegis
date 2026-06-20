import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { activityAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ActivityTracker() {
  const { addToast } = useToast();
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    type: 'Walking',
    name: '',
    duration: '',
    caloriesBurned: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const activityTypes = ['Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Strength Training', 'Other'];

  const fetchActivities = async () => {
    try {
      const [res, statsRes] = await Promise.all([
        activityAPI.getAll(),
        activityAPI.getStats()
      ]);
      setActivities(res.data);
      setStats(statsRes.data);
    } catch (err) {
      addToast('Failed to load activities.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleOpenModal = (activity = null) => {
    if (activity) {
      setEditingId(activity._id);
      setFormData({
        type: activity.type,
        name: activity.name,
        duration: activity.duration,
        caloriesBurned: activity.caloriesBurned || '',
        date: activity.date,
        notes: activity.notes || '',
        intensity: activity.intensity || 'Medium'
      });
    } else {
      setEditingId(null);
      setFormData({
        type: 'Walking',
        name: '',
        duration: '',
        caloriesBurned: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        intensity: 'Medium'
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        duration: Number(formData.duration),
        caloriesBurned: formData.caloriesBurned ? Number(formData.caloriesBurned) : undefined
      };

      if (editingId) {
        await activityAPI.update(editingId, data);
        addToast('Activity updated successfully!', 'success');
      } else {
        await activityAPI.create(data);
        addToast('Activity logged successfully!', 'success');
      }
      setShowModal(false);
      fetchActivities();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save activity.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    try {
      await activityAPI.delete(id);
      addToast('Activity deleted.', 'success');
      fetchActivities();
    } catch (err) {
      addToast('Failed to delete activity.', 'error');
    }
  };

  const typeIcon = (type) => {
    switch (type) {
      case 'Walking': return '🚶';
      case 'Running': return '🏃';
      case 'Cycling': return '🚴';
      case 'Swimming': return '🏊';
      case 'Yoga': return '🧘';
      case 'Strength Training': return '🏋️';
      default: return '⏱️';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Activity Tracker</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Log and monitor your daily physical activities.</p>
        </div>
        <button className="btn-submit" onClick={() => handleOpenModal()} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px' }}>
          + Log Activity
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>⏳ Loading activities...</div>
      ) : (
        <div className="widget-grid">
          
          {/* KPI Cards */}
          <div className="widget-glass" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔥</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>{stats?.totalCalories || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Calories</div>
          </div>
          <div className="widget-glass" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱️</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-purple)' }}>{stats?.totalMinutes || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Minutes</div>
          </div>
          <div className="widget-glass" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-amber)' }}>{stats?.streak || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Day Streak</div>
          </div>
          <div className="widget-glass" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏃</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-emerald)' }}>{stats?.totalActivities || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Activities</div>
          </div>

          {/* Weekly Chart */}
          <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Last 7 Days (Calories & Minutes)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.weeklyData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-muted)" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="left" stroke="var(--text-muted)" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip contentStyle={{ background: 'rgba(10,17,40,0.95)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                  <Bar yAxisId="left" dataKey="calories" name="Calories Burned" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="duration" name="Duration (min)" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Breakdown and AI Insights */}
          <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              {Object.entries(stats?.breakdown || {}).map(([type, count]) => (
                <span key={type} style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--accent-cyan)', padding: '0.4rem 0.8rem', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '600' }}>
                  {typeIcon(type)} {type}: {count}
                </span>
              ))}
            </div>
          </div>

          {/* Log */}
          <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Recent Activities</h3>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏃</div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Activities Logged</h3>
                <p style={{ color: 'var(--text-muted)' }}>Start tracking your fitness journey by logging an activity.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {activities.map((activity) => (
                  <div key={activity._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)', borderRadius: '10px',
                    transition: 'all 0.2s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(0,229,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.border = '1px solid var(--border-glass)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ fontSize: '2rem', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,229,255,0.1)', borderRadius: '12px' }}>
                        {typeIcon(activity.type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#fff', marginBottom: '0.2rem' }}>{activity.name}</div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                          <span>📅 {new Date(activity.date).toLocaleDateString()}</span>
                          <span>⏱️ {activity.duration} mins</span>
                          {activity.caloriesBurned && <span>🔥 {activity.caloriesBurned} kcal</span>}
                          {activity.intensity && <span style={{ background: activity.intensity === 'High' ? 'rgba(244,63,94,0.1)' : activity.intensity === 'Medium' ? 'rgba(0,229,255,0.1)' : 'rgba(16,185,129,0.1)', color: activity.intensity === 'High' ? 'var(--accent-rose)' : activity.intensity === 'Medium' ? 'var(--accent-cyan)' : 'var(--accent-emerald)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>{activity.intensity}</span>}
                        </div>
                        {activity.notes && <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{activity.notes}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleOpenModal(activity)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                      <button onClick={() => handleDelete(activity._id)} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="widget-glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{editingId ? 'Edit Activity' : 'Log Activity'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Activity Type</label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Activity Name (e.g. Morning Jog)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter activity name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duration (min)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 30"
                    min="1"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Intensity</label>
                  <select
                    className="input-field"
                    value={formData.intensity}
                    onChange={e => setFormData({ ...formData, intensity: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Calories (kcal)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 250"
                    min="0"
                    value={formData.caloriesBurned}
                    onChange={e => setFormData({ ...formData, caloriesBurned: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Notes (optional)</label>
                <textarea
                  className="input-field"
                  rows="2"
                  placeholder="How did it feel?"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px' }}>
                  {editingId ? 'Save Changes' : 'Log Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
