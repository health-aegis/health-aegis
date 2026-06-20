import { Request, Response } from 'express';
import { MedicationModel, CaregiverModel, SystemStatusModel } from '../models/models';

export const getMedications = async (req: Request, res: Response) => {
  try {
    const medications = await MedicationModel.find({ userId: req.userId });
    res.json(medications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createMedication = async (req: Request, res: Response) => {
  try {
    const newMed = new MedicationModel({ ...req.body, userId: req.userId, missedCount: 0 });
    const saved = await newMed.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateMedication = async (req: Request, res: Response) => {
  try {
    const med = await MedicationModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, lastUpdated: new Date().toISOString() },
      { new: true }
    );
    if (!med) return res.status(404).json({ error: 'Medication not found' });
    res.json(med);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMedication = async (req: Request, res: Response) => {
  try {
    const deleted = await MedicationModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Medication not found' });
    res.json({ message: 'Medication deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const takeMedication = async (req: Request, res: Response) => {
  try {
    const { time } = req.body;
    const med = await MedicationModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!med) return res.status(404).json({ error: 'Medication not found' });

    let scheduleUpdated = false;
    med.schedules = med.schedules.map((s) => {
      if (s.time === time) { s.taken = true; s.takenAt = new Date().toISOString(); scheduleUpdated = true; }
      return s;
    });
    if (!scheduleUpdated) return res.status(400).json({ error: 'Schedule time not found' });

    med.missedCount = 0;
    med.lastUpdated = new Date().toISOString();
    await med.save();
    res.json(med);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const missMedication = async (req: Request, res: Response) => {
  try {
    const { time } = req.body;
    const med = await MedicationModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!med) return res.status(404).json({ error: 'Medication not found' });

    let scheduleUpdated = false;
    med.schedules = med.schedules.map((s) => {
      if (s.time === time) { s.taken = false; s.takenAt = undefined; scheduleUpdated = true; }
      return s;
    });
    if (!scheduleUpdated) return res.status(400).json({ error: 'Schedule time not found' });

    med.missedCount += 1;
    med.lastUpdated = new Date().toISOString();
    await med.save();

    // Check caregiver alert threshold (user-scoped)
    const caregiver = await CaregiverModel.findOne({ userId: req.userId });
    if (caregiver && med.missedCount >= caregiver.alertThreshold) {
      let status = await SystemStatusModel.findOne({ userId: req.userId });
      if (!status) status = new SystemStatusModel({ userId: req.userId });
      status.caregiverAlerted = true;
      status.alertReason = `Patient missed ${med.name} (${med.dosage}) ${med.missedCount} consecutive times. Threshold: ${caregiver.alertThreshold}.`;
      status.lastNotificationSent = new Date().toISOString();
      await status.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('alert', {
          type: 'Medication',
          severity: 'Critical',
          message: `Patient missed ${med.name} (${med.dosage}) ${med.missedCount} time(s). Caregiver notified.`,
          reason: status.alertReason,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.json(med);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const resetAllMedications = async (req: Request, res: Response) => {
  try {
    const medications = await MedicationModel.find({ userId: req.userId });
    for (const med of medications) {
      med.schedules = med.schedules.map((s) => { s.taken = false; s.takenAt = undefined; return s; });
      med.missedCount = 0;
      med.lastUpdated = new Date().toISOString();
      await med.save();
    }
    res.json({ message: 'All medication schedules reset' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
