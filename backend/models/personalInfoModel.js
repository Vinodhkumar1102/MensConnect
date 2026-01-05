const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Personal information schema
 * Fields mirror the Profile screen: name, phone, gender, dob, emergency, avatar
 */
const PersonalInfoSchema = new Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '', unique: true, sparse: true },
    gender: { type: String, trim: true, default: '' },
    dob: { type: Date },
    emergency: { type: String, trim: true, default: '' },
    avatar: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PersonalInfo', PersonalInfoSchema);
