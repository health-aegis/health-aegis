import { Request, Response } from 'express';
import { MedicalRecordModel } from '../models/models';

export const getHistory = async (req: Request, res: Response) => {
  try {
    const records = await MedicalRecordModel.find({ userId: req.userId });
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createHistory = async (req: Request, res: Response) => {
  try {
    const newRecord = new MedicalRecordModel({ ...req.body, userId: req.userId });
    const saved = await newRecord.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateHistory = async (req: Request, res: Response) => {
  try {
    const updated = await MedicalRecordModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Record not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteHistory = async (req: Request, res: Response) => {
  try {
    const deleted = await MedicalRecordModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Medical record deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
