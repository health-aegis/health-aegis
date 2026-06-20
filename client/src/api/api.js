/**
 * api/api.js — Thin wrappers used by older dashboard components.
 *
 * NOTE: This file re-exports from services/api.js for all calls that need auth.
 * The `api` instance from services/api.js has the JWT interceptor attached.
 * Do NOT use raw `axios` here — it won't send the Bearer token.
 */
import api from '../services/api';

// ─── Medical History ──────────────────────────────────────────────────────────

export const getHistory = () =>
  api.get('/history').then((r) => r.data);

export const addHistory = (payload) =>
  api.post('/history', payload).then((r) => r.data);

// ─── Appointments ─────────────────────────────────────────────────────────────

export const getAppointments = () =>
  api.get('/appointments').then((r) => r.data);

export const addAppointment = (payload) =>
  api.post('/appointments', payload).then((r) => r.data);

// ─── Medications ──────────────────────────────────────────────────────────────

export const getMedications = () =>
  api.get('/medications').then((r) => r.data);

export const addMedication = (payload) =>
  api.post('/medications', payload).then((r) => r.data);

export const takeMedication = (medId, time) =>
  api.post(`/medications/${medId}/take`, { time }).then((r) => r.data);

export const missMedication = (medId, time) =>
  api.post(`/medications/${medId}/miss`, { time }).then((r) => r.data);

export const resetMedications = () =>
  api.post('/medications/reset-all').then((r) => r.data);

// ─── Caregiver ────────────────────────────────────────────────────────────────

export const getCaregiver = () =>
  api.get('/caregiver').then((r) => r.data);

export const updateCaregiver = (payload) =>
  api.post('/caregiver', payload).then((r) => r.data);

// ─── System Status ────────────────────────────────────────────────────────────

export const getStatus = () =>
  api.get('/status').then((r) => r.data);

export const resetStatus = () =>
  api.post('/status/reset').then((r) => r.data);

// ─── AI Chat ──────────────────────────────────────────────────────────────────

export const sendChatMessage = (message) =>
  api.post('/ai/chat', { message }).then((r) => r.data);

// ─── Multi-Agent Analysis ─────────────────────────────────────────────────────
// Uses the authenticated api instance — JWT token is auto-attached by interceptor.

export const runAgentAnalysis = (query) =>
  api.post('/agents/analyze', { query }).then((r) => r.data);

// ─── Batch fetch all dashboard data ──────────────────────────────────────────

export const fetchAllDashboardData = async () => {
  const [history, appointments, medications, caregiver, systemStatus] = await Promise.all([
    getHistory(),
    getAppointments(),
    getMedications(),
    getCaregiver(),
    getStatus(),
  ]);
  return { history, appointments, medications, caregiver, systemStatus };
};
