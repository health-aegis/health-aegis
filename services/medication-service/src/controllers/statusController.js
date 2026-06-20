const { SystemStatus } = require('../models/models');

const getStatus = async (req, res, next) => {
  try {
    let status = await SystemStatus.findOne({ userId: req.userId });
    if (!status) status = await SystemStatus.create({ userId: req.userId, caregiverAlerted: false });
    res.json(status);
  } catch (err) { next(err); }
};

const resetStatus = async (req, res, next) => {
  try {
    const status = (await SystemStatus.findOne({ userId: req.userId })) || new SystemStatus({ userId: req.userId });
    status.caregiverAlerted     = false;
    status.alertReason           = undefined;
    status.lastNotificationSent  = undefined;
    await status.save();
    res.json(status);
  } catch (err) { next(err); }
};

module.exports = { getStatus, resetStatus };
