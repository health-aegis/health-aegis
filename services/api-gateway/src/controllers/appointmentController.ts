import { Request, Response } from 'express';
import { AppointmentModel } from '../models/models';

export const getAppointments = async (req: Request, res: Response) => {
  try {
    const appointments = await AppointmentModel.find({ userId: req.userId });
    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const newAppointment = new AppointmentModel({ ...req.body, userId: req.userId });
    const saved = await newAppointment.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const updated = await AppointmentModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Appointment not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const deleted = await AppointmentModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
