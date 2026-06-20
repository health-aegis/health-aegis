export interface MedicalRecord {
  id?: string;
  userId?: string;
  date: string;
  category: string; // e.g., "Allergy", "Surgery", "Diagnosis", "Lab Result"
  title: string;
  description: string;
  notes?: string;
  // Azure Blob Storage fields
  blobUrl?: string;
  blobName?: string;
  processingStatus?: 'none' | 'pending' | 'processed' | 'failed';
  extractedText?: string;
  createdAt?: string;
}

export interface Appointment {
  id?: string;
  userId?: string;
  dateTime: string; // ISO string
  provider: string;
  specialty: string;
  purpose: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface MedicationSchedule {
  time: string; // e.g., "08:00", "20:00"
  taken?: boolean;
  takenAt?: string;
}

export interface Medication {
  id?: string;
  userId?: string;
  name: string;
  dosage: string;
  frequency: string; // e.g., "Daily", "Weekly"
  schedules: MedicationSchedule[]; // Daily times and state
  startDate: string;
  endDate?: string;
  instructions?: string;
  missedCount: number; // consecutive missed counts
  lastUpdated?: string;
}

export interface Caregiver {
  id?: string;
  userId?: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  alertThreshold: number; // e.g., 2 missed medications
}

export interface SystemStatus {
  id?: string;
  userId?: string;
  caregiverAlerted: boolean;
  alertReason?: string;
  lastNotificationSent?: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface Activity {
  id?: string;
  userId?: string;
  type: string;
  name: string;
  duration: number;
  caloriesBurned?: number;
  date: string;
  notes?: string;
  createdAt?: string;
}
