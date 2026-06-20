import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[Error] ${err.message}`);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
};
