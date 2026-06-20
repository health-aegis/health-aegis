import React from 'react';
import { Sliders, Plus } from 'lucide-react';

function SettingsSection({
  caregiver,
  setCaregiver,
  onCaregiverSubmit,
  medicationForm,
  setMedicationForm,
  onMedicationSubmit,
}) {
  return (
    <>
      {/* Caregiver Configuration */}
      <div className="glass-card">
        <div className="card-header">
          <Sliders className="card-icon" size={18} />
          <h3 className="card-title" style={{ fontSize: '1rem' }}>Emergency Caregiver Config</h3>
        </div>
        <form onSubmit={onCaregiverSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Caregiver Name</label>
              <input
                id="cg-name"
                type="text"
                className="form-input"
                value={caregiver.name}
                onChange={(e) => setCaregiver((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Relationship</label>
              <input
                id="cg-relationship"
                type="text"
                className="form-input"
                value={caregiver.relationship}
                onChange={(e) => setCaregiver((p) => ({ ...p, relationship: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                id="cg-phone"
                type="text"
                className="form-input"
                value={caregiver.phone}
                onChange={(e) => setCaregiver((p) => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="cg-email"
                type="email"
                className="form-input"
                value={caregiver.email}
                onChange={(e) => setCaregiver((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Missed Doses Alert Threshold (consecutive count)</label>
              <input
                id="cg-threshold"
                type="number"
                className="form-input"
                min={1}
                max={10}
                value={caregiver.alertThreshold}
                onChange={(e) => setCaregiver((p) => ({ ...p, alertThreshold: Number(e.target.value) }))}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-submit" style={{ width: '100%' }}>
            Save Caregiver Configuration
          </button>
        </form>
      </div>

      {/* Add New Medication Config */}
      <div className="glass-card">
        <div className="card-header">
          <Plus className="card-icon" size={18} />
          <h3 className="card-title" style={{ fontSize: '1rem' }}>Configure New Medication</h3>
        </div>
        <form onSubmit={onMedicationSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Medication Name</label>
              <input
                id="med-name"
                type="text"
                className="form-input"
                placeholder="e.g. Metformin"
                value={medicationForm.name}
                onChange={(e) => setMedicationForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Dosage</label>
              <input
                id="med-dosage"
                type="text"
                className="form-input"
                placeholder="e.g. 500mg, 1 tablet"
                value={medicationForm.dosage}
                onChange={(e) => setMedicationForm((p) => ({ ...p, dosage: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <select
                id="med-frequency"
                className="form-select"
                value={medicationForm.frequency}
                onChange={(e) => setMedicationForm((p) => ({ ...p, frequency: e.target.value }))}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Times (24h, comma separated)</label>
              <input
                id="med-times"
                type="text"
                className="form-input"
                placeholder="e.g. 08:00, 20:00"
                value={medicationForm.times}
                onChange={(e) => setMedicationForm((p) => ({ ...p, times: e.target.value }))}
                required
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Instructions (Optional)</label>
              <input
                id="med-instructions"
                type="text"
                className="form-input"
                placeholder="Take with meals, swallow whole, do not crush"
                value={medicationForm.instructions}
                onChange={(e) => setMedicationForm((p) => ({ ...p, instructions: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-blue))',
            }}
          >
            Configure Medication
          </button>
        </form>
      </div>
    </>
  );
}

export default SettingsSection;
