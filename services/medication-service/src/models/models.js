const mongoose = require('mongoose');

const MedicationScheduleSchema = new mongoose.Schema({
  time:    { type: String, required: true },
  taken:   { type: Boolean, default: false },
  takenAt: { type: String },
});

const MedicationSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  dosage:       { type: String, required: true },
  frequency:    { type: String, required: true },
  schedules:    [MedicationScheduleSchema],
  startDate:    { type: String, required: true },
  endDate:      { type: String },
  instructions: { type: String },
  missedCount:  { type: Number, default: 0 },
  lastUpdated:  { type: String },
});

const CaregiverSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  relationship:   { type: String, required: true },
  phone:          { type: String, required: true },
  email:          { type: String, required: true },
  alertThreshold: { type: Number, default: 2 },
});

const SystemStatusSchema = new mongoose.Schema({
  caregiverAlerted:     { type: Boolean, default: false },
  alertReason:          { type: String },
  lastNotificationSent: { type: String },
});

const Medication   = mongoose.model('Medication',   MedicationSchema);
const Caregiver    = mongoose.model('Caregiver',    CaregiverSchema);
const SystemStatus = mongoose.model('SystemStatus', SystemStatusSchema);

module.exports = { Medication, Caregiver, SystemStatus };
