import { Schema, model, Types } from 'mongoose';
import { MedicalRecord, Appointment, Medication, Caregiver, SystemStatus } from '../../../../shared/types';

// ─── Medical Record ───────────────────────────────────────────────────────────
const MedicalRecordSchema = new Schema<MedicalRecord>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  notes: { type: String, required: false },
  // Azure Blob Storage fields
  blobUrl: { type: String, required: false },
  blobName: { type: String, required: false },
  processingStatus: { type: String, enum: ['none', 'pending', 'processed', 'failed'], default: 'none' },
  extractedText: { type: String, required: false },
}, { timestamps: true });

export const MedicalRecordModel = model<MedicalRecord>('MedicalRecord', MedicalRecordSchema);

// ─── Appointment ──────────────────────────────────────────────────────────────
const AppointmentSchema = new Schema<Appointment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dateTime: { type: String, required: true },
  provider: { type: String, required: true },
  specialty: { type: String, required: true },
  purpose: { type: String, required: true },
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled', required: true },
  notes: { type: String, required: false },
});

export const AppointmentModel = model<Appointment>('Appointment', AppointmentSchema);

// ─── Medication ───────────────────────────────────────────────────────────────
const MedicationScheduleSchema = new Schema({
  time: { type: String, required: true },
  taken: { type: Boolean, default: false },
  takenAt: { type: String, required: false },
});

const MedicationSchema = new Schema<Medication>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  schedules: [MedicationScheduleSchema],
  startDate: { type: String, required: true },
  endDate: { type: String, required: false },
  instructions: { type: String, required: false },
  missedCount: { type: Number, default: 0, required: true },
  lastUpdated: { type: String, required: false },
});

export const MedicationModel = model<Medication>('Medication', MedicationSchema);

// ─── Caregiver Config ─────────────────────────────────────────────────────────
const CaregiverSchema = new Schema<Caregiver>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  alertThreshold: { type: Number, default: 2, required: true },
});

export const CaregiverModel = model<Caregiver>('Caregiver', CaregiverSchema);

// ─── System Status ────────────────────────────────────────────────────────────
const SystemStatusSchema = new Schema<SystemStatus>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  caregiverAlerted: { type: Boolean, default: false, required: true },
  alertReason: { type: String, required: false },
  lastNotificationSent: { type: String, required: false },
});

export const SystemStatusModel = model<SystemStatus>('SystemStatus', SystemStatusSchema);

// ─── Activity Tracker (new) ───────────────────────────────────────────────────

export interface IActivity {
  _id?: string;
  userId: Types.ObjectId | string;
  type: string;
  name: string;
  duration: number;
  caloriesBurned?: number;
  date: string;
  notes?: string;
  intensity?: 'Low' | 'Medium' | 'High';
  createdAt?: Date;
}

const ActivitySchema = new Schema<IActivity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  caloriesBurned: { type: Number, required: false },
  date: { type: String, required: true },
  notes: { type: String, required: false },
  intensity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium', required: false },
}, { timestamps: true });

export const ActivityModel = model<IActivity>('Activity', ActivitySchema);
