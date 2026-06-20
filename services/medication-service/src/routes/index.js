const { Router } = require('express');
const medCtrl      = require('../controllers/medicationController');
const caregiverCtrl = require('../controllers/caregiverController');
const statusCtrl   = require('../controllers/statusController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = Router();

router.get('/healthz', (req, res) => res.json({ status: 'healthy', service: 'medication-service' }));

// Medications (order matters — reset-all before :id)
router.get( '/api/medications',            authMiddleware, medCtrl.getMedications);
router.post('/api/medications',            authMiddleware, medCtrl.createMedication);
router.post('/api/medications/reset-all',  authMiddleware, medCtrl.resetAllMedications);
router.post('/api/medications/:id/take',   authMiddleware, medCtrl.takeMedication);
router.post('/api/medications/:id/miss',   authMiddleware, medCtrl.missMedication);

// Caregiver
router.get( '/api/caregiver', authMiddleware, caregiverCtrl.getCaregiver);
router.post('/api/caregiver', authMiddleware, caregiverCtrl.updateCaregiver);

// System Status
router.get( '/api/status',       authMiddleware, statusCtrl.getStatus);
router.post('/api/status/reset', authMiddleware, statusCtrl.resetStatus);

module.exports = router;
