require('dotenv').config();
const connectDB = require('../config/db');
const AdminUser = require('../models/adminModel');
const bcrypt = require('bcrypt');

const argv = process.argv.slice(2);
if (argv.length < 2) {
  console.log('Usage: node scripts/createAdmin.js email password [name]');
  process.exit(1);
}

const [email, password, name] = argv;

(async () => {
  try {
    await connectDB();
    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.log('Admin already exists:', existing.email);
      process.exit(0);
    }
    const hash = await bcrypt.hash(password, 10);
    const admin = new AdminUser({ email: email.toLowerCase(), passwordHash: hash, name: name || 'Admin' });
    await admin.save();
    console.log('Admin created:', admin.email);
    process.exit(0);
  } catch (e) {
    console.error('Error creating admin:', e.message);
    process.exit(1);
  }
})();
