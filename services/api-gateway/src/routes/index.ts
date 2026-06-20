import { Router } from 'express';
import * as historyController from '../controllers/historyController';
import * as appointmentController from '../controllers/appointmentController';
import * as medicationController from '../controllers/medicationController';
import * as caregiverController from '../controllers/caregiverController';
import * as statusController from '../controllers/statusController';
import * as aiController from '../controllers/aiController';
import * as authController from '../controllers/authController';
import * as adminController from '../controllers/adminController';
import * as activityController from '../controllers/activityController';
import * as cosmosController from '../controllers/cosmosController';
import { authMiddleware } from '../middleware/authMiddleware';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const IMAGING_URL = process.env.IMAGING_SERVICE_URL || 'http://imaging-service:5004';
const DIAGNOSTICS_URL = process.env.DIAGNOSTICS_SERVICE_URL || 'http://diagnostic-agent-service:5005';

import * as http from 'http';
import * as https from 'https';

// ─── Imaging Upload — pipe multipart body directly to FastAPI ─────────────────
router.post('/imaging/upload', authMiddleware, (req: any, res: any) => {
    const targetUrl = new URL(`${IMAGING_URL}/upload`);
    const isHttps = targetUrl.protocol === 'https:';
    const lib = isHttps ? https : http;
    const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: '/upload',
        method: 'POST',
        headers: {
            ...req.headers,
            host: targetUrl.host,
        },
    };
    const proxyReq = lib.request(options, (proxyRes) => {
        res.status(proxyRes.statusCode || 500);
        Object.entries(proxyRes.headers).forEach(([k, v]) => {
            if (v !== undefined) res.setHeader(k, v as string);
        });
        proxyRes.pipe(res, { end: true });
    });
    proxyReq.on('error', (e: any) => {
        res.status(502).json({ error: 'Imaging service unavailable', details: e.message });
    });
    req.pipe(proxyReq, { end: true });
});

// ─── Imaging GET user images ──────────────────────────────────────────────────
router.get('/imaging/user/:userId', authMiddleware, async (req: any, res: any) => {
    try {
        const r = await fetch(`${IMAGING_URL}/user/${req.params.userId}`);
        const data = await r.json();
        res.status(r.status).json(data);
    } catch (e: any) {
        res.status(502).json({ error: 'Imaging service unavailable', details: e.message });
    }
});

// ─── Imaging — update image status ───────────────────────────────────────────
router.patch('/imaging/:imageId/status', authMiddleware, async (req: any, res: any) => {
    try {
        const r = await fetch(`${IMAGING_URL}/image/${req.params.imageId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await r.json();
        res.status(r.status).json(data);
    } catch (e: any) {
        res.status(502).json({ error: 'Imaging service unavailable', details: e.message });
    }
});

// ─── Diagnostic Agent Analyze — direct fetch (body-parser already consumed JSON body) ──
router.post('/diagnostics/analyze', authMiddleware, async (req: any, res: any) => {
    try {
        const r = await fetch(`${DIAGNOSTICS_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await r.json();
        res.status(r.status).json(data);
    } catch (e: any) {
        res.status(502).json({ error: 'Diagnostic service unavailable', details: e.message });
    }
});

// ─── Auth (public) ────────────────────────────────────────────────────────────
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authController.getMe);

// All routes below require a valid JWT ────────────────────────────────────────

// ─── Medical History ─────────────────────────────────────────────────────────
router.get('/history', authMiddleware, historyController.getHistory);
router.post('/history', authMiddleware, historyController.createHistory);
router.put('/history/:id', authMiddleware, historyController.updateHistory);
router.delete('/history/:id', authMiddleware, historyController.deleteHistory);

// ─── File Upload (Azure Blob Storage) ───────────────────────────────────────
import * as uploadController from '../controllers/uploadController';
router.post('/history/upload', authMiddleware, uploadController.uploadMiddleware, uploadController.uploadHealthRecord);
router.get('/history/upload/:id/status', authMiddleware, uploadController.getUploadStatus);

// ─── Cosmos DB — OCR Processed Documents ──────────────────────────────────────
router.get('/history/documents', authMiddleware, cosmosController.getProcessedDocuments);

// ─── Appointments ─────────────────────────────────────────────────────────────
router.get('/appointments', authMiddleware, appointmentController.getAppointments);
router.post('/appointments', authMiddleware, appointmentController.createAppointment);
router.put('/appointments/:id', authMiddleware, appointmentController.updateAppointment);
router.delete('/appointments/:id', authMiddleware, appointmentController.deleteAppointment);

// ─── Medications ──────────────────────────────────────────────────────────────
router.get('/medications', authMiddleware, medicationController.getMedications);
router.post('/medications', authMiddleware, medicationController.createMedication);
router.put('/medications/:id', authMiddleware, medicationController.updateMedication);
router.delete('/medications/:id', authMiddleware, medicationController.deleteMedication);
router.post('/medications/reset-all', authMiddleware, medicationController.resetAllMedications);
router.post('/medications/:id/take', authMiddleware, medicationController.takeMedication);
router.post('/medications/:id/miss', authMiddleware, medicationController.missMedication);

// ─── Caregiver Config ─────────────────────────────────────────────────────────
router.get('/caregiver', authMiddleware, caregiverController.getCaregiver);
router.post('/caregiver', authMiddleware, caregiverController.updateCaregiver);

// ─── System Status ────────────────────────────────────────────────────────────
router.get('/status', authMiddleware, statusController.getStatus);
router.post('/status/reset', authMiddleware, statusController.resetStatus);

// ─── Activity Tracker ─────────────────────────────────────────────────────────
router.get('/activities', authMiddleware, activityController.getActivities);
router.get('/activities/stats', authMiddleware, activityController.getStats);
router.post('/activities', authMiddleware, activityController.createActivity);
router.put('/activities/:id', authMiddleware, activityController.updateActivity);
router.delete('/activities/:id', authMiddleware, activityController.deleteActivity);

// ─── AI Chat ──────────────────────────────────────────────────────────────────
router.post('/ai/chat', authMiddleware, aiController.handleChat);

// ─── Multi-Agent Analysis ─────────────────────────────────────────────────────
import * as agentController from '../controllers/agentController';
router.post('/agents/analyze', authMiddleware, agentController.handleAgentAnalysis);

// ─── Admin User Management ────────────────────────────────────────────────────
router.get('/admin/users', authMiddleware, adminController.getAllUsers);
router.get('/admin/caregivers', authMiddleware, adminController.getCaregivers);
router.get('/admin/my-patients', authMiddleware, adminController.getMyPatients);
router.post('/admin/assign', authMiddleware, adminController.assignPatientToCaregiver);
router.delete('/admin/users/:id', authMiddleware, adminController.deleteUser);

export default router;
