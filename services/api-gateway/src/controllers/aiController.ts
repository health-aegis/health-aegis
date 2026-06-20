import { Request, Response } from 'express';
import { getAIHealthResponse } from '../services/aiEngine/aiService';

export const handleChat = async (req: Request, res: Response) => {
  const { message } = req.body;
  const userId = (req as any).userId;
  if (!message) return res.status(400).json({ error: 'Message payload is required' });

  try {
    const reply = await getAIHealthResponse(message, userId);
    res.json({ reply });
  } catch (error: any) {
    console.error('Error handling AI chat route:', error);
    res.status(500).json({ error: 'Failed to process AI health response.' });
  }
};
