const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aegis_super_secret_key_change_in_production';

/**
 * Decodes the Bearer token and attaches `req.userId` for downstream handlers.
 * Rejects requests without a valid token with 401.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = { authMiddleware };
