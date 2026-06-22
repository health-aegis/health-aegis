const { MedicalRecord } = require('../models/models');

const getHistory = async (req, res, next) => {
  try {
    const records = await MedicalRecord.find({ userId: req.userId });
    res.json(records);
  } catch (err) { next(err); }
};

const createHistory = async (req, res, next) => {
  try {
    const record = new MedicalRecord({ ...req.body, userId: req.userId });
    const saved  = await record.save();
    res.status(201).json(saved);
  } catch (err) { next(err); }
};

const updateHistory = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    if (record.userId?.toString() !== req.userId?.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { next(err); }
};

const deleteHistory = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    if (record.userId?.toString() !== req.userId?.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await MedicalRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Medical record deleted' });
  } catch (err) { next(err); }
};

module.exports = { getHistory, createHistory, updateHistory, deleteHistory };
