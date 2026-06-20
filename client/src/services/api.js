import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aegis_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password, role) => api.post('/auth/register', { name, email, password, role }),
  getMe: () => api.get('/auth/me'),
};

// ─── Medications ────────────────────────────────────────────────────────────
export const medicationsAPI = {
  getAll: () => api.get('/medications'),
  create: (data) => api.post('/medications', data),
  update: (id, data) => api.put(`/medications/${id}`, data),
  delete: (id) => api.delete(`/medications/${id}`),
  take: (id, time) => api.post(`/medications/${id}/take`, { time }),
  miss: (id, time) => api.post(`/medications/${id}/miss`, { time }),
  resetAll: () => api.post('/medications/reset-all'),
};

// ─── Medical Records ────────────────────────────────────────────────────────
export const historyAPI = {
  getAll: () => api.get('/history'),
  create: (data) => api.post('/history', data),
  update: (id, data) => api.put(`/history/${id}`, data),
  delete: (id) => api.delete(`/history/${id}`),
  upload: (formData) => api.post('/history/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getDocuments: () => api.get('/history/documents'),
};

// ─── Appointments ───────────────────────────────────────────────────────────
export const appointmentsAPI = {
  getAll: () => api.get('/appointments'),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
};

// ─── Caregiver ──────────────────────────────────────────────────────────────
export const caregiverAPI = {
  get: () => api.get('/caregiver'),
  update: (data) => api.post('/caregiver', data),
};

// ─── System Status ──────────────────────────────────────────────────────────
export const statusAPI = {
  get: () => api.get('/status'),
  reset: () => api.post('/status/reset'),
};

// ─── Activity Tracker ───────────────────────────────────────────────────────
export const activityAPI = {
  getAll: () => api.get('/activities'),
  getStats: () => api.get('/activities/stats'),
  create: (data) => api.post('/activities', data),
  update: (id, data) => api.put(`/activities/${id}`, data),
  delete: (id) => api.delete(`/activities/${id}`),
};

// ─── AI Health Agent (Agent 1 — General Health) ──────────────────────────────
export const aiAPI = {
  chat: (message) => api.post('/ai/chat', { message }),
};

// ─── Medical Imaging FastAPI (PostgreSQL + Azure Blob Storage) ───────────────
export const imagingAPI = {
  upload: (userId, file) => {
    const fd = new FormData();
    fd.append('user_id', userId);
    fd.append('file', file);
    return api.post('/imaging/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getUserImages: (userId) => api.get(`/imaging/user/${userId}`),
  updateStatus: (imageId, status, diagnosticReport = null) =>
    api.patch(`/imaging/${imageId}/status`, { status, diagnostic_report: diagnosticReport }),
};

// ─── Diagnostic Agent FastAPI (Agent 2 — Azure AI Foundry Vision) ────────────
export const diagnosticsAPI = {
  analyze: (imageUrl, patientContext) =>
    api.post('/diagnostics/analyze', {
      image_url: imageUrl,
      patient_context: patientContext,
    }),
};

// ─── Admin User Management ──────────────────────────────────────────────────
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  getCaregivers: () => api.get('/admin/caregivers'),
  getMyPatients: (caregiverId) => api.get('/admin/my-patients', { params: { caregiverId } }),
  assignPatient: (patientId, caregiverId) => api.post('/admin/assign', { patientId, caregiverId }),
  unassignPatient: (patientId) => api.post('/admin/assign', { patientId, caregiverId: null }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
