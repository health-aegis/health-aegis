import React from 'react';
import { Pill, RefreshCw, AlertTriangle, Clock } from 'lucide-react';

function MedicationChecklist({ medications, onMarkMedication, onResetRoutines }) {
  return (
    <div className="glass-card">
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Pill className="card-icon" size={20} />
          <h2 className="card-title">Medication Schedule &amp; Adherence</h2>
        </div>
        <button
          className="btn-reset-routine"
          onClick={onResetRoutines}
          title="Resets all taken checklists for testing worker routines"
        >
          <RefreshCw size={12} style={{ marginRight: '4px' }} />
          Reset Checklist
        </button>
      </div>

      <div className="med-list">
        {medications.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
            No active medications configured. Add one in the Config Panel tab.
          </p>
        ) : (
          medications.map((med) => {
            const medId = med.id || med._id;
            const isHighMiss = med.missedCount > 0;
            return (
              <div key={medId} className={`med-card ${isHighMiss ? 'missed-alert' : ''}`}>
                <div className="med-meta-header">
                  <div className="med-title-group">
                    <h4>
                      {med.name}{' '}
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                        ({med.dosage})
                      </span>
                    </h4>
                    <p>
                      {med.frequency} • Started: {med.startDate}
                    </p>
                  </div>
                  {med.missedCount > 0 && (
                    <span className="missed-badge">
                      <AlertTriangle size={12} />
                      {med.missedCount} Missed
                    </span>
                  )}
                </div>

                {med.instructions && (
                  <p className="med-instruction">💡 {med.instructions}</p>
                )}

                <div className="schedules-checklist">
                  {med.schedules.map((sched, idx) => {
                    const today = new Date().toISOString().split('T')[0];
                    const isMissedToday = sched.takenAt?.startsWith(`missed-${today}`);
                    let statusClass = '';
                    if (sched.taken) statusClass = 'taken';
                    else if (isMissedToday) statusClass = 'missed';

                    return (
                      <div key={idx} className={`schedule-pill ${statusClass}`}>
                        <Clock size={12} style={{ marginRight: '4px' }} />
                        <span>{sched.time}</span>

                        {!sched.taken && !isMissedToday && (
                          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                            <button
                              className="pill-action-btn take"
                              onClick={() => onMarkMedication(medId, sched.time, 'take')}
                              title="Mark taken"
                            >
                              ✓
                            </button>
                            <button
                              className="pill-action-btn miss"
                              onClick={() => onMarkMedication(medId, sched.time, 'miss')}
                              title="Mark missed"
                              style={{ color: 'var(--accent-rose)' }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {sched.taken && (
                          <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>(Taken)</span>
                        )}
                        {isMissedToday && (
                          <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>(Missed)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MedicationChecklist;
