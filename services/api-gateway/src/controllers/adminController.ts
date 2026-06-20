import { Request, Response } from 'express';
import { UserModel } from '../models/userModel';

// GET /api/admin/users — list all users (without passwords)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find()
      .select('-password')
      .populate('assignedCaregiverId', 'name email role');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/admin/assign — assign patient(s) to a caregiver
// Body: { patientId: string, caregiverId: string | null }
export const assignPatientToCaregiver = async (req: Request, res: Response) => {
  try {
    const { patientId, caregiverId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId is required.' });

    const patient = await UserModel.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    if (patient.role !== 'patient') return res.status(400).json({ error: 'Target user is not a patient.' });

    if (caregiverId) {
      const caregiver = await UserModel.findById(caregiverId);
      if (!caregiver) return res.status(404).json({ error: 'Caregiver not found.' });
      if (caregiver.role !== 'caregiver') return res.status(400).json({ error: 'Target user is not a caregiver.' });
      patient.assignedCaregiverId = caregiverId;
    } else {
      patient.assignedCaregiverId = undefined;
    }

    await patient.save();
    const updated = await UserModel.findById(patientId).select('-password').populate('assignedCaregiverId', 'name email role');
    return res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/admin/users/:id — remove a user account
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ message: `User "${user.name}" deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/users/caregivers — just list caregivers (for dropdown)
export const getCaregivers = async (req: Request, res: Response) => {
  try {
    const caregivers = await UserModel.find({ role: 'caregiver' }).select('-password');
    res.json(caregivers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/users/my-patients — patients assigned to the logged-in caregiver
export const getMyPatients = async (req: Request, res: Response) => {
  try {
    const { caregiverId } = req.query;
    if (!caregiverId) return res.status(400).json({ error: 'caregiverId is required.' });
    const patients = await UserModel.find({ role: 'patient', assignedCaregiverId: caregiverId }).select('-password');
    res.json(patients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
