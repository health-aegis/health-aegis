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

module.exports = { getHistory, createHistory };
