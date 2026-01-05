const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true, default: 'Admin' },
    role: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminUser', AdminUserSchema);
