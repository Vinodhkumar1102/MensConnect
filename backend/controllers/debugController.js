const PersonalInfo = require('../models/personalInfoModel');
const db = require('../config/db');

exports.status = async (req, res) => {
  try {
    const status = typeof db.getConnectionStatus === 'function' ? db.getConnectionStatus() : { readyState: 0 };
    const count = await PersonalInfo.countDocuments();
    const latest = await PersonalInfo.findOne().sort({ createdAt: -1 });
    res.json({ success: true, status, count, latest });
  } catch (e) {
    console.error('debug.status error', e.message || e);
    res.status(500).json({ success: false, message: e.message || 'error' });
  }
};
