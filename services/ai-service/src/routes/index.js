const { Router } = require('express');
const { handleChat } = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = Router();

router.get('/healthz', (req, res) =>
  res.json({ status: 'healthy', service: 'ai-service' })
);

// Protected: requires valid JWT — userId attached to req by authMiddleware
router.post('/api/ai/chat', authMiddleware, handleChat);

module.exports = router;
