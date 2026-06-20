import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { medicationsAPI } from '../../services/api';

export default function Medications() {
  const { addToast } = useToast();
  const [medsList, setMedsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', dosage: '', frequency: 'Daily', schedules: [{ time: '08:00' }], startDate: '', instructions: '' });

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const res = await medicationsAPI.getAll();
      setMedsList(res.data);
    } catch (err) {
      addToast('Failed to load medications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (med = null) => {
    if (med) {
      setEditingId(med._id);
      setFormData({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        schedules: med.schedules.length > 0 ? med.schedules.map(s => ({ time: s.time })) : [{ time: '08:00' }],
        startDate: med.startDate || new Date().toISOString().split('T')[0],
        instructions: med.instructions || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', dosage: '', frequency: 'Daily', schedules: [{ time: '08:00' }], startDate: new Date().toISOString().split('T')[0], instructions: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, startDate: formData.startDate || new Date().toISOString().split('T')[0] };
      if (editingId) {
        await medicationsAPI.update(editingId, payload);
        addToast('Medication updated successfully!', 'success');
      } else {
        await medicationsAPI.create({ ...payload, missedCount: 0 });
        addToast('Medication added successfully!', 'success');
      }
      setShowModal(false);
      fetchMedications();
    } catch {
      addToast(editingId ? 'Failed to update medication.' : 'Failed to add medication.', 'error');
    }
  };

  const handleTake = async (med) => {
    try {
      const pendingSchedule = med.schedules.find(s => !s.taken);
      if (!pendingSchedule) { addToast('All doses already taken for today.', 'info'); return; }
      await medicationsAPI.take(med._id, pendingSchedule.time);
      addToast(`${med.name} marked as taken.`, 'success');
      fetchMedications();
    } catch {
      addToast('Could not mark medication as taken.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medication?')) return;
    try {
      await medicationsAPI.delete(id);
      addToast('Medication deleted.', 'info');
      fetchMedications();
    } catch {
      addToast('Failed to delete medication.', 'error');
    }
  };

  const getStatusColor = (taken, missedCount) => {
    if (taken) return 'var(--accent-emerald)';
    if (missedCount > 0) return 'var(--accent-rose)';
    return 'var(--accent-cyan)';
  };

  const getMedStatus = (med) => {
    if (med.schedules.length === 0) return 'No Schedule';
    if (med.schedules.every(s => s.taken)) return 'Taken';
    if (med.missedCount > 0) return 'Missed';
    return 'Pending';
  };

  const adherence = medsList.length === 0 ? 0
    : Math.round((medsList.filter(m => m.schedules.every(s => s.taken) && m.schedules.length > 0).length / medsList.length) * 100);

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Medication Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track adherence and manage your prescriptions.</p>
        </div>
        <button className="btn-submit" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
          onClick={() => handleOpenModal()}>
          + Add Medication
        </button>
      </div>

      <div className="widget-grid">
        {/* Adherence Score */}
        <div className="widget-glass" style={{ gridColumn: 'span 4' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Adherence Score</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(var(--accent-cyan) ${adherence}%, rgba(255,255,255,0.05) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: '900', lineHeight: '1' }}>{adherence}%</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="widget-glass" style={{ gridColumn: 'span 8', background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.05), rgba(10, 17, 40, 0.8))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🤖</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>AI Adherence Insights</h3>
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {adherence < 80
              ? `⚠️ Your adherence is ${adherence}%. Missed doses increase health risks. Try setting an alarm.`
              : `✅ Your adherence is ${adherence}%. Excellent work! Keep maintaining your schedule.`}
          </p>
          <button onClick={() => addToast('Evening alarm set for 08:00 PM.', 'success')}
            style={{ marginTop: '1rem', background: 'var(--accent-amber)', color: '#000', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
            Set Reminder Alarm
          </button>
        </div>

        {/* Medication Table */}
        <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Active Prescriptions</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>⏳ Loading medications...</div>
          ) : medsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No medications found. Add your first prescription above.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    {['Medication', 'Dosage', 'Frequency', 'Schedule', 'Status', 'Missed', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {medsList.map((med) => {
                    const status = getMedStatus(med);
                    return (
                      <tr key={med._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{med.name}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{med.dosage}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{med.frequency}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                          {med.schedules.map(s => s.time).join(', ')}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ background: `rgba(${status === 'Taken' ? '16,185,129' : status === 'Missed' ? '244,63,94' : '0,229,255'}, 0.1)`, color: getStatusColor(status === 'Taken', med.missedCount), padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: med.missedCount > 0 ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>{med.missedCount}</td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                          {status !== 'Taken' && (
                            <button onClick={() => handleTake(med)} style={{ background: 'var(--accent-emerald)', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>✓ Take</button>
                          )}
                          <button onClick={() => handleOpenModal(med)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Edit</button>
                          <button onClick={() => handleDelete(med._id)} style={{ background: 'transparent', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-rose)', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="widget-glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{editingId ? 'Edit Prescription' : 'New Prescription'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Medication Name *</label>
                  <input required type="text" className="input-field" placeholder="e.g. Lisinopril"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dosage *</label>
                  <input required type="text" className="input-field" placeholder="e.g. 10mg"
                    value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Schedule Time</label>
                  <input type="time" className="input-field" style={{ colorScheme: 'dark' }}
                    value={formData.schedules[0]?.time || '08:00'} onChange={e => setFormData({ ...formData, schedules: [{ time: e.target.value }] })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Frequency</label>
                  <select className="input-field" value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}>
                    <option>Daily</option>
                    <option>Twice Daily</option>
                    <option>Weekly</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Instructions</label>
                <input type="text" className="input-field" placeholder="e.g. Take with food"
                  value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px' }}>
                  {editingId ? 'Save Changes' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
