import React from 'react';
import { Plus, Calendar } from 'lucide-react';

function AppointmentSection({ appointments, appointmentForm, setAppointmentForm, onSubmit }) {
  const formatDateBlock = (dateTimeStr) => {
    try {
      const d = new Date(dateTimeStr);
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      return {
        month: months[d.getMonth()],
        day: d.getDate(),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { month: 'APPT', day: '?', time: 'Scheduled' };
    }
  };

  return (
    <>
      {/* Add Appointment Form */}
      <div className="glass-card">
        <div className="card-header">
          <Plus className="card-icon" size={18} />
          <h3 className="card-title" style={{ fontSize: '1rem' }}>Schedule Appointment</h3>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Doctor / Provider Name</label>
              <input
                id="appt-provider"
                type="text"
                className="form-input"
                placeholder="Dr. Jane Foster"
                value={appointmentForm.provider}
                onChange={(e) => setAppointmentForm((p) => ({ ...p, provider: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Specialty</label>
              <input
                id="appt-specialty"
                type="text"
                className="form-input"
                placeholder="Cardiology, General, etc."
                value={appointmentForm.specialty}
                onChange={(e) => setAppointmentForm((p) => ({ ...p, specialty: e.target.value }))}
                required
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Date &amp; Time</label>
              <input
                id="appt-datetime"
                type="datetime-local"
                className="form-input"
                value={appointmentForm.dateTime}
                onChange={(e) => setAppointmentForm((p) => ({ ...p, dateTime: e.target.value }))}
                required
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Purpose of Visit</label>
              <input
                id="appt-purpose"
                type="text"
                className="form-input"
                placeholder="Routine blood pressure review, diagnostic discussion"
                value={appointmentForm.purpose}
                onChange={(e) => setAppointmentForm((p) => ({ ...p, purpose: e.target.value }))}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-submit" style={{ width: '100%' }}>
            Schedule Appointment
          </button>
        </form>
      </div>

      {/* Appointment List */}
      <div className="glass-card">
        <div className="card-header">
          <Calendar className="card-icon" size={18} />
          <h3 className="card-title" style={{ fontSize: '1rem' }}>Upcoming Appointments</h3>
        </div>
        <div className="appt-list">
          {appointments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              No upcoming appointments scheduled.
            </p>
          ) : (
            appointments.map((appt) => {
              const dt = formatDateBlock(appt.dateTime);
              return (
                <div key={appt.id || appt._id} className="appt-card">
                  <div className="appt-date-block">
                    <span className="appt-month">{dt.month}</span>
                    <span className="appt-day">{dt.day}</span>
                    <span className="appt-time">{dt.time}</span>
                  </div>
                  <div className="appt-details">
                    <h4 className="appt-provider">Dr. {appt.provider}</h4>
                    <span className="appt-specialty">{appt.specialty}</span>
                    <p className="appt-purpose">{appt.purpose}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default AppointmentSection;
