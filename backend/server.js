// server.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const connectDB = require('./config/db');

connectDB();
// Log DB connection status shortly after startup for debugging
try {
  const db = require('./config/db');
  setTimeout(() => {
    try {
      if (typeof db.getConnectionStatus === 'function') {
        console.log('MongoDB status:', db.getConnectionStatus());
      }
    } catch (e) {}
  }, 2000);
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 4000;

// locate admin dist early so root handler can serve index.html when present
const adminDist = path.join(__dirname, '..', 'admin', 'dist');
const adminExists = fs.existsSync(adminDist);
console.log('Admin dist path:', adminDist, 'exists:', adminExists);

app.use(cors());
// Increase body size limits to allow JSON payloads containing base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  if (adminExists) return res.sendFile(path.join(adminDist, 'index.html'));
  res.send('MensConnect Backend Running 🚀');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Personal info routes (CRUD + avatar upload)
const personalInfoRoutes = require('./routes/personalInfoRoutes');
app.use('/api/personal-info', personalInfoRoutes);

// Blood request routes
const bloodRoutes = require('./routes/bloodRequestRoutes');
app.use('/api/blood-requests', bloodRoutes);

// Debug routes
const debugRoutes = require('./routes/debugRoutes');
app.use('/api/debug', debugRoutes);

// Admin routes (setup/login)
try {
  const adminRoutes = require('./routes/adminRoutes');
  app.use('/api/admin', adminRoutes);
} catch (e) {
  console.warn('Admin routes not available:', e.message);
}

// Serve admin static build with SPA fallback so client-side routes work on refresh
const adminDist = path.join(__dirname, '..', 'admin', 'dist');
const adminExists = fs.existsSync(adminDist);
console.log('Admin dist path:', adminDist, 'exists:', adminExists);
if (adminExists) {
  app.use(express.static(adminDist));

  app.get('*', (req, res, next) => {
    // allow API and uploads to continue normally
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(adminDist, 'index.html'));
  });
} else {
  console.warn('admin/dist not found — SPA routes will return 404. Ensure postinstall built the admin.');
}

// ✅ THIS FIXES EVERYTHING

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  console.error('SERVER ERROR:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
