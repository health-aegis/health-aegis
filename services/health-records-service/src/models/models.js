const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:        { type: String, required: true },
  category:    { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String, required: true },
  notes:       { type: String },
}, { timestamps: true });

const AppointmentSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dateTime:  { type: String, required: true },
  provider:  { type: String, required: true },
  specialty: { type: String, required: true },
  purpose:   { type: String, required: true },
  status:    { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
  notes:     { type: String },
});

const MedicalRecord = mongoose.model('MedicalRecord', MedicalRecordSchema);
const Appointment   = mongoose.model('Appointment',   AppointmentSchema);

module.exports = { MedicalRecord, Appointment };
