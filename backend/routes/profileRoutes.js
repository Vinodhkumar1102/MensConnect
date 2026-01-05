const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const profileController = require('../controllers/profileController');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Routes
router.get('/', profileController.getProfile);
router.post('/update', profileController.updateProfile);

module.exports = router;
