import React from 'react';
import { Plus, FileText } from 'lucide-react';

function HistorySection({ history, historyForm, setHistoryForm, onSubmit }) {
  return (
    <>
      {/* Add History Form */}
      <div className="glass-card">
        <div className="card-header">
          <Plus className="card-icon" size={18} />
          <h3 className="card-title" style={{ fontSize: '1rem' }}>Log Medical History</h3>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                id="history-category"
                className="form-select"
                value={historyForm.category}
                onChange={(e) => setHistoryForm((p) => ({ ...p, category: e.target.value }))}
              >
                <option value="Diagnosis">Diagnosis</option>
                <option value="Allergy">Allergy</option>
                <option value="Surgery">Surgery</option>
                <option value="Lab Result">Lab Result</option>
                <option value="Immunization">Immunization</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                id="history-date"
                type="date"
                className="form-input"
                value={historyForm.date}
                onChange={(e) => setHistoryForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Title / Subject</label>
              <input
                id="history-title"
                type="text"
                className="form-input"
                placeholder="e.g. Stage I Hypertension, Penicillin allergy"
                value={historyForm.title}
                onChange={(e) => setHistoryForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Details / Clinical Description</label>
              <textarea
                id="history-description"
                className="form-input"
                rows={2}
                placeholder="Doctor notes, symptoms, or diagnostic results..."
                value={historyForm.description}
                onChange={(e) => setHistoryForm((p) => ({ ...p, description: e.target.value }))}
                required
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Additional Notes (Optional)</label>
              <input
                id="history-notes"
                type="text"
                className="form-input"
                placeholder="e.g. Ref checked twice daily, next check scheduled"
                value={historyForm.notes}
                onChange={(e) => setHistoryForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" className="btn-submit" style={{ width: '100%' }}>
            Add History Entry
          </button>
        </form>
      </div>

      {/* History List */}
      <div className="glass-card">
        <div className="card-header">
          <FileText className="card-icon" size={18} />
          <h3 className="card-title" style={{ fontSize: '1rem' }}>Medical Records Journal</h3>
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              No history records logged. Use the form above to log diagnoses or allergies.
            </p>
          ) : (
            history.map((record) => (
              <div key={record.id || record._id} className="history-card">
                <div className="history-card-header">
                  <span className="history-category">{record.category}</span>
                  <span className="history-date">{record.date}</span>
                </div>
                <h4 className="history-title">{record.title}</h4>
                <p className="history-desc">{record.description}</p>
                {record.notes && <p className="history-notes">Note: {record.notes}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default HistorySection;
