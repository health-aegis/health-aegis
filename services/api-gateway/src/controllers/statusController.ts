import { Request, Response } from 'express';
import { SystemStatusModel } from '../models/models';

export const getStatus = async (req: Request, res: Response) => {
  try {
    let status = await SystemStatusModel.findOne({ userId: req.userId });
    if (!status) status = await SystemStatusModel.create({ userId: req.userId, caregiverAlerted: false });
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const resetStatus = async (req: Request, res: Response) => {
  try {
    let status = await SystemStatusModel.findOne({ userId: req.userId });
    if (!status) status = new SystemStatusModel({ userId: req.userId });
    status.caregiverAlerted = false;
    status.alertReason = undefined;
    status.lastNotificationSent = undefined;
    await status.save();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
