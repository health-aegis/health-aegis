import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { appointmentsAPI } from '../../services/api';

export default function Appointments() {
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({ provider: '', specialty: '', dateTime: '', purpose: '', notes: '', status: 'Scheduled' });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await appointmentsAPI.getAll();
      setAppointments(res.data);
    } catch {
      addToast('Failed to load appointments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (appt = null) => {
    if (appt) {
      setEditingId(appt._id);
      // Ensure datetime local format (YYYY-MM-DDThh:mm)
      let dt = appt.dateTime;
      if (dt && dt.includes('Z')) dt = new Date(dt).toISOString().slice(0, 16);
      setForm({
        provider: appt.provider,
        specialty: appt.specialty,
        dateTime: dt,
        purpose: appt.purpose,
        notes: appt.notes || '',
        status: appt.status || 'Scheduled'
      });
    } else {
      setEditingId(null);
      setForm({ provider: '', specialty: '', dateTime: '', purpose: '', notes: '', status: 'Scheduled' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await appointmentsAPI.update(editingId, form);
        addToast('Appointment updated successfully!', 'success');
      } else {
        await appointmentsAPI.create({ ...form, status: 'Scheduled' });
        addToast('Appointment booked successfully!', 'success');
      }
      setShowModal(false);
      fetchAppointments();
    } catch {
      addToast(editingId ? 'Failed to update appointment.' : 'Failed to book appointment.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel and delete this appointment?')) return;
    try {
      await appointmentsAPI.delete(id);
      addToast('Appointment deleted.', 'success');
      fetchAppointments();
    } catch {
      addToast('Failed to delete appointment.', 'error');
    }
  };

  const upcoming = appointments.filter(a => a.status === 'Scheduled');
  const past = appointments.filter(a => a.status !== 'Scheduled');

  const formatDate = (dt) => {
    try { return new Date(dt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return dt; }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Appointments</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your doctor consultations and bookings.</p>
        </div>
        <button className="btn-submit" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
          onClick={() => handleOpenModal()}>
          + Book Appointment
        </button>
      </div>

      <div className="widget-grid">
        {/* Upcoming */}
        <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Upcoming ({upcoming.length})
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>⏳ Loading appointments...</div>
          ) : upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No upcoming appointments. Book one above.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {upcoming.map((a) => (
                <div key={a._id} style={{ display: 'flex', gap: '1.5rem', padding: '1.25rem', background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '12px', alignItems: 'center' }}>
                  <div style={{ fontSize: '2.5rem' }}>🏥</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>Dr. {a.provider}</div>
                    <div style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: '600' }}>{a.specialty}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{a.purpose}</div>
                    {a.notes && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>📝 {a.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ fontWeight: '700', color: '#fff' }}>{formatDate(a.dateTime)}</div>
                    <span style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--accent-cyan)', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '10px', fontWeight: '600' }}>{a.status}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button onClick={() => handleOpenModal(a)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>Edit</button>
                      <button onClick={() => handleDelete(a._id)} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Appointments */}
        {past.length > 0 && (
          <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Past Appointments ({past.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {past.map((a) => (
                <div key={a._id} style={{ display: 'flex', gap: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', alignItems: 'center', opacity: 0.7 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>Dr. {a.provider} · <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>{a.specialty}</span></div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{a.purpose}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(a.dateTime)}</span>
                    <span style={{ background: a.status === 'Completed' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: a.status === 'Completed' ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '10px' }}>
                      {a.status === 'Completed' ? '✓' : '✕'} {a.status}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleOpenModal(a)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>Edit</button>
                      <button onClick={() => handleDelete(a._id)} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking/Editing Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="widget-glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{editingId ? 'Edit Appointment' : 'Book Appointment'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Doctor / Provider *</label>
                  <input required type="text" className="input-field" placeholder="e.g. Dr. Sarah Jenkins"
                    value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Specialty *</label>
                  <input required type="text" className="input-field" placeholder="e.g. Cardiology"
                    value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date & Time *</label>
                  <input required type="datetime-local" className="input-field" style={{ colorScheme: 'dark' }}
                    value={form.dateTime} onChange={e => setForm({ ...form, dateTime: e.target.value })} />
                </div>
                {editingId && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</label>
                    <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Purpose *</label>
                <input required type="text" className="input-field" placeholder="e.g. Annual check-up"
                  value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Notes</label>
                <textarea rows="2" className="input-field" placeholder="Bring lab reports, list current medications..." style={{ resize: 'vertical' }}
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px' }}>
                  {editingId ? 'Save Changes' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
