const { Appointment } = require('../models/models');

const getAppointments = async (req, res, next) => {
  try {
    const list = await Appointment.find({ userId: req.userId });
    res.json(list);
  } catch (err) { next(err); }
};

const createAppointment = async (req, res, next) => {
  try {
    const appt  = new Appointment({ ...req.body, userId: req.userId });
    const saved = await appt.save();
    res.status(201).json(saved);
  } catch (err) { next(err); }
};

module.exports = { getAppointments, createAppointment };
