import { Request, Response } from 'express';
import { CaregiverModel } from '../models/models';

export const getCaregiver = async (req: Request, res: Response) => {
  try {
    const caregiver = await CaregiverModel.findOne({ userId: req.userId });
    res.json(caregiver || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCaregiver = async (req: Request, res: Response) => {
  try {
    let caregiver = await CaregiverModel.findOne({ userId: req.userId });
    if (caregiver) {
      Object.assign(caregiver, req.body);
      await caregiver.save();
    } else {
      caregiver = new CaregiverModel({ ...req.body, userId: req.userId });
      await caregiver.save();
    }
    res.json(caregiver);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
