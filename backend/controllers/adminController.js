const AdminUser = require('../models/adminModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

exports.setup = async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const existing = await AdminUser.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: 'Admin already exists' });

  const hash = await bcrypt.hash(password, 10);
  const admin = new AdminUser({ email: email.toLowerCase(), passwordHash: hash, name: name || 'Admin' });
  await admin.save();
  return res.json({ message: 'Admin created' });
}

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await AdminUser.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
}

// middleware to protect admin routes
exports.requireAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
