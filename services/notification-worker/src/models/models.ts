import { Schema, model, Types } from 'mongoose';
import { MedicalRecord, Appointment, Medication, Caregiver, SystemStatus } from '../types';

// Medical Record Schema
const MedicalRecordSchema = new Schema<MedicalRecord>({
  date: { type: String, required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  notes: { type: String, required: false },
}, { timestamps: true });

export const MedicalRecordModel = model<MedicalRecord>('MedicalRecord', MedicalRecordSchema);

// Appointment Schema
const AppointmentSchema = new Schema<Appointment>({
  dateTime: { type: String, required: true },
  provider: { type: String, required: true },
  specialty: { type: String, required: true },
  purpose: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Scheduled', 'Completed', 'Cancelled'], 
    default: 'Scheduled', 
    required: true 
  },
  notes: { type: String, required: false },
});

export const AppointmentModel = model<Appointment>('Appointment', AppointmentSchema);

// Medication Schedule Schema
const MedicationScheduleSchema = new Schema({
  time: { type: String, required: true },
  taken: { type: Boolean, default: false },
  takenAt: { type: String, required: false }
});

// Medication Schema
const MedicationSchema = new Schema<Medication>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  schedules: [MedicationScheduleSchema],
  startDate: { type: String, required: true },
  endDate: { type: String, required: false },
  instructions: { type: String, required: false },
  missedCount: { type: Number, default: 0, required: true },
  lastUpdated: { type: String, required: false }
});

export const MedicationModel = model<Medication>('Medication', MedicationSchema);

// Caregiver Configuration Schema
const CaregiverSchema = new Schema<Caregiver>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  alertThreshold: { type: Number, default: 2, required: true }
});

export const CaregiverModel = model<Caregiver>('Caregiver', CaregiverSchema);

// System Status Schema
const SystemStatusSchema = new Schema<SystemStatus>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  caregiverAlerted: { type: Boolean, default: false, required: true },
  alertReason: { type: String, required: false },
  lastNotificationSent: { type: String, required: false },
  lastResetDate: { type: String, required: false },
});

export const SystemStatusModel = model<SystemStatus>('SystemStatus', SystemStatusSchema);
