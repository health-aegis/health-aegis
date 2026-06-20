const { getAIHealthResponse } = require('../services/aiEngine');

const handleChat = async (req, res, next) => {
  const { message } = req.body;
  const userId = req.userId; // set by authMiddleware
  if (!message) return res.status(400).json({ error: 'Message payload is required' });
  try {
    const reply = await getAIHealthResponse(message, userId);
    res.json({ reply });
  } catch (err) { next(err); }
};

module.exports = { handleChat };
