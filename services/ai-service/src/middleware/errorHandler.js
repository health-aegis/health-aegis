const errorHandler = (err, req, res, next) => {
  console.error(`[ai-service] Error: ${err.message}`);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
};
const notFound = (req, res) => res.status(404).json({ error: `Route ${req.originalUrl} not found` });

module.exports = { errorHandler, notFound };
