const { Medication, Caregiver, SystemStatus } = require('../models/models');

const getMedications = async (req, res, next) => {
  try {
    const meds = await Medication.find({ userId: req.userId });
    res.json(meds);
  } catch (err) { next(err); }
};

const createMedication = async (req, res, next) => {
  try {
    const med  = new Medication({ ...req.body, userId: req.userId, missedCount: 0 });
    const saved = await med.save();
    res.status(201).json(saved);
  } catch (err) { next(err); }
};

const takeMedication = async (req, res, next) => {
  try {
    const { time } = req.body;
    const med = await Medication.findOne({ _id: req.params.id, userId: req.userId });
    if (!med) return res.status(404).json({ error: 'Medication not found' });

    let updated = false;
    med.schedules = med.schedules.map((s) => {
      if (s.time === time) { s.taken = true; s.takenAt = new Date().toISOString(); updated = true; }
      return s;
    });
    if (!updated) return res.status(400).json({ error: 'Schedule time not found' });

    med.missedCount = 0;
    med.lastUpdated = new Date().toISOString();
    await med.save();
    res.json(med);
  } catch (err) { next(err); }
};

const missMedication = async (req, res, next) => {
  try {
    const { time } = req.body;
    const med = await Medication.findOne({ _id: req.params.id, userId: req.userId });
    if (!med) return res.status(404).json({ error: 'Medication not found' });

    let updated = false;
    med.schedules = med.schedules.map((s) => {
      if (s.time === time) { s.taken = false; s.takenAt = undefined; updated = true; }
      return s;
    });
    if (!updated) return res.status(400).json({ error: 'Schedule time not found' });

    med.missedCount += 1;
    med.lastUpdated = new Date().toISOString();
    await med.save();

    // Check caregiver alert threshold
    const caregiver = await Caregiver.findOne({ userId: req.userId });
    if (caregiver && med.missedCount >= caregiver.alertThreshold) {
      const status = (await SystemStatus.findOne({ userId: req.userId })) || new SystemStatus({ userId: req.userId });
      status.caregiverAlerted = true;
      status.alertReason = `Patient missed ${med.name} (${med.dosage}) ${med.missedCount} times! Threshold: ${caregiver.alertThreshold}.`;
      status.lastNotificationSent = new Date().toISOString();
      await status.save();
    }
    res.json(med);
  } catch (err) { next(err); }
};

const resetAllMedications = async (req, res, next) => {
  try {
    const meds = await Medication.find({ userId: req.userId });
    for (const med of meds) {
      med.schedules = med.schedules.map((s) => { s.taken = false; s.takenAt = undefined; return s; });
      med.missedCount = 0;
      med.lastUpdated = new Date().toISOString();
      await med.save();
    }
    res.json({ message: 'All medication schedules reset' });
  } catch (err) { next(err); }
};

module.exports = { getMedications, createMedication, takeMedication, missMedication, resetAllMedications };
