const { Router } = require('express');
const historyCtrl     = require('../controllers/historyController');
const appointmentCtrl = require('../controllers/appointmentController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = Router();

// Health check
router.get('/healthz', (req, res) => res.json({ status: 'healthy', service: 'health-records-service' }));

// Medical History
router.get(   '/api/history',     authMiddleware, historyCtrl.getHistory);
router.post(  '/api/history',     authMiddleware, historyCtrl.createHistory);
router.put(   '/api/history/:id', authMiddleware, historyCtrl.updateHistory);
router.delete('/api/history/:id', authMiddleware, historyCtrl.deleteHistory);

// Appointments
router.get( '/api/appointments', authMiddleware, appointmentCtrl.getAppointments);
router.post('/api/appointments', authMiddleware, appointmentCtrl.createAppointment);

module.exports = router;
