/**
 * Shared domain types — local copy scoped to this service.
 * Source of truth: ai-devops/shared/types.ts
 */

export interface MedicalRecord {
  id?: string;
  date: string;
  category: string;
  title: string;
  description: string;
  notes?: string;
  createdAt?: string;
}

export interface Appointment {
  id?: string;
  dateTime: string;
  provider: string;
  specialty: string;
  purpose: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface MedicationSchedule {
  time: string;
  taken?: boolean;
  takenAt?: string;
}

export interface Medication {
  id?: string;
  userId: any;
  name: string;
  dosage: string;
  frequency: string;
  schedules: MedicationSchedule[];
  startDate: string;
  endDate?: string;
  instructions?: string;
  missedCount: number;
  lastUpdated?: string;
}

export interface Caregiver {
  userId: any;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  alertThreshold: number;
}

export interface SystemStatus {
  userId: any;
  caregiverAlerted: boolean;
  alertReason?: string;
  lastNotificationSent?: string;
  lastResetDate?: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}
