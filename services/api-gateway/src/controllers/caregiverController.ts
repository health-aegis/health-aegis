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
    const body = { ...req.body };
    // JSON serialises NaN as null; guard against null/NaN threshold before Mongoose validates
    if (body.alertThreshold == null || Number.isNaN(Number(body.alertThreshold))) {
      body.alertThreshold = 2;
    } else {
      body.alertThreshold = Number(body.alertThreshold);
    }

    let caregiver = await CaregiverModel.findOne({ userId: req.userId });
    if (caregiver) {
      Object.assign(caregiver, body);
      await caregiver.save();
    } else {
      caregiver = new CaregiverModel({ ...body, userId: req.userId });
      await caregiver.save();
    }
    res.json(caregiver);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
