const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

function imageFilter(req, file, cb) {
  if (!file.mimetype) return cb(new Error('Missing mimetype'), false);
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
}

const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB
};

const upload = multer({ storage, fileFilter: imageFilter, limits });

module.exports = upload;
