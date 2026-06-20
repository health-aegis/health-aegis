const mongoose = require('mongoose');

// Read-only models used to build patient context for AI
const MedicalRecordSchema = new mongoose.Schema({
  date: String, category: String, title: String,
  description: String, notes: String,
}, { timestamps: true });

const AppointmentSchema = new mongoose.Schema({
  dateTime: String, provider: String, specialty: String,
  purpose: String, status: String, notes: String,
});

const MedicationScheduleSchema = new mongoose.Schema({
  time: String, taken: Boolean, takenAt: String,
});

const MedicationSchema = new mongoose.Schema({
  name: String, dosage: String, frequency: String,
  schedules: [MedicationScheduleSchema],
  startDate: String, missedCount: Number,
});

const CaregiverSchema = new mongoose.Schema({
  name: String, relationship: String,
  phone: String, email: String, alertThreshold: Number,
});

const SystemStatusSchema = new mongoose.Schema({
  caregiverAlerted: Boolean,
  alertReason: String, lastNotificationSent: String,
});

module.exports = {
  MedicalRecord: mongoose.model('MedicalRecord', MedicalRecordSchema),
  Appointment:   mongoose.model('Appointment',   AppointmentSchema),
  Medication:    mongoose.model('Medication',     MedicationSchema),
  Caregiver:     mongoose.model('Caregiver',      CaregiverSchema),
  SystemStatus:  mongoose.model('SystemStatus',   SystemStatusSchema),
};
