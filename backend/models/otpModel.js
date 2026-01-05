const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  otp: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // expires in 5 minutes
});

module.exports = mongoose.model('Otp', otpSchema);
