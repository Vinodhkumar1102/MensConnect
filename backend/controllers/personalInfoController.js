const PersonalInfo = require('../models/personalInfoModel');
const path = require('path');
const fs = require('fs');

// Create or update personal info. Expects multipart/form-data with optional file 'avatar'
exports.createOrUpdate = async (req, res) => {
  try {
    const db = require('../config/db');
    try { console.log('personalInfo.createOrUpdate - DB status', typeof db.getConnectionStatus === 'function' ? db.getConnectionStatus() : {}); } catch (e) {}

    // log incoming payload for debugging
    console.log('personalInfo.createOrUpdate - headers:', req.headers && req.headers['content-type']);
    console.log('personalInfo.createOrUpdate - body keys:', Object.keys(req.body || {}));
    console.log('personalInfo.createOrUpdate - body.avatar (raw):', req.body && req.body.avatar);
    if (req.file) console.log('personalInfo.createOrUpdate - received file:', { originalname: req.file.originalname, filename: req.file.filename, size: req.file.size, path: req.file.path });

    const { name, phone, gender, dob, emergency, id } = req.body || {};
    let avatarPath = '';
    if (req.file && req.file.filename) {
      // store a web-accessible path relative to server root
      avatarPath = `/uploads/avatars/${req.file.filename}`;
    }

    // If client sent base64 payload (fallback), decode and write file server-side
    if (!avatarPath && req.body && req.body.avatarBase64) {
      try {
        const b64 = req.body.avatarBase64;
        // support data URI like: data:image/jpeg;base64,/9j/4AAQ...
        const matches = String(b64).match(/^data:(image\/.+?);base64,(.+)$/);
        let buffer;
        let ext = '.jpg';
        if (matches) {
          const mime = matches[1];
          const data = matches[2];
          buffer = Buffer.from(data, 'base64');
          if (mime.indexOf('/') !== -1) ext = '.' + mime.split('/')[1];
        } else {
          // assume raw base64
          buffer = Buffer.from(b64, 'base64');
        }
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const fname = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const full = path.join(uploadsDir, fname);
        fs.writeFileSync(full, buffer);
        avatarPath = `/uploads/avatars/${fname}`;
        console.log('personalInfo.createOrUpdate - saved base64 avatar to', full);
      } catch (e) {
        console.warn('personalInfo.createOrUpdate - failed to save base64 avatar', e.message || e);
      }
    }

    // If DB not connected, return explicit error
    try {
      const status = typeof db.getConnectionStatus === 'function' ? db.getConnectionStatus() : null;
      if (status && !status.isConnected) {
        console.error('personalInfo.createOrUpdate - MongoDB not connected', status);
        return res.status(500).json({ success: false, message: 'MongoDB not connected', status });
      }
    } catch (e) {}

    let doc;
    // Prefer explicit id, else try to find by phone to avoid duplicate profiles for same number
    if (id) {
      doc = await PersonalInfo.findById(id);
    } else if (phone) {
      doc = await PersonalInfo.findOne({ phone: String(phone) });
    }

    if (doc) {
      // update existing
      doc.name = name || doc.name;
      doc.phone = phone || doc.phone;
      doc.gender = gender || doc.gender;
      if (dob) doc.dob = new Date(dob);
      doc.emergency = emergency || doc.emergency;
      // Prefer uploaded file path, else accept non-empty avatar string from JSON body
      if (avatarPath) {
        doc.avatar = avatarPath;
      } else if (req.body && typeof req.body.avatar === 'string' && req.body.avatar.trim()) {
        doc.avatar = String(req.body.avatar).trim();
      } else if (req.body && req.body.avatar !== undefined) {
        console.log('personalInfo.createOrUpdate - incoming avatar present but empty, ignoring to avoid overwriting existing');
      }
      console.log('personalInfo.createOrUpdate - updating existing doc id', doc._id, 'avatar (before save)=>', doc.avatar);
      await doc.save();
      console.log('personalInfo.createOrUpdate - updated doc saved avatar=>', doc.avatar);
    } else {
      // create new document
      const payload = { name, phone, gender, emergency };
      if (dob) payload.dob = new Date(dob);
      // If file uploaded, use that. Otherwise accept non-empty avatar string in JSON.
      if (avatarPath) payload.avatar = avatarPath;
      else if (req.body && typeof req.body.avatar === 'string' && req.body.avatar.trim()) payload.avatar = String(req.body.avatar).trim();
      else if (req.body && req.body.avatar !== undefined) {
        console.log('personalInfo.createOrUpdate - incoming avatar present but empty on create, ignoring');
      }
      doc = new PersonalInfo(payload);
      console.log('personalInfo.createOrUpdate - creating new doc payload', payload);
      await doc.save();
      console.log('personalInfo.createOrUpdate - created doc id', doc._id, 'avatar=>', doc.avatar);
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('personalInfo.createOrUpdate', err);
    res.status(500).json({ success: false, message: err.message || 'Server error', error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PersonalInfo.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('personalInfo.getById', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// List all personal info documents
exports.listAll = async (req, res) => {
  try {
    const { phone } = req.query || {};
    if (phone) {
      // normalize to last 10 digits
      const last10 = String(phone).replace(/\D/g, '').slice(-10);
      if (!last10) return res.json({ success: true, data: null });
      // match phone that ends with the same 10 digits
      const doc = await PersonalInfo.findOne({ phone: { $regex: last10 + '$' } });
      return res.json({ success: true, data: doc || null });
    }

    const docs = await PersonalInfo.find().sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error('personalInfo.listAll', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Update by id (optional avatar file in req.file)
exports.updateById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PersonalInfo.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    const { name, phone, gender, dob, emergency } = req.body;
    console.log('personalInfo.updateById - body keys:', Object.keys(req.body || {}));
    console.log('personalInfo.updateById - body.avatar (raw):', req.body && req.body.avatar);
    if (name !== undefined) doc.name = name;
    if (phone !== undefined) doc.phone = phone;
    if (gender !== undefined) doc.gender = gender;
    if (dob) doc.dob = new Date(dob);
    if (emergency !== undefined) doc.emergency = emergency;

    if (req.file && req.file.filename) {
      console.log('personalInfo.updateById - received file:', { originalname: req.file.originalname, filename: req.file.filename, size: req.file.size, path: req.file.path });
      // remove old avatar file if present
      if (doc.avatar) {
        try {
          const rel = String(doc.avatar).replace(/^\//, '');
          const full = path.join(__dirname, '..', rel);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        } catch (e) {
          console.warn('Failed to remove old avatar', e.message || e);
        }
      }
      doc.avatar = `/uploads/avatars/${req.file.filename}`;
    } else if (req.body && typeof req.body.avatar === 'string' && req.body.avatar.trim()) {
      // if client sent avatar as string (URL) on update and it's non-empty, accept it
      doc.avatar = String(req.body.avatar).trim();
    } else if (req.body && req.body.avatar !== undefined) {
      console.log('personalInfo.updateById - incoming avatar present but empty, ignoring to avoid overwrite');
    }

    // support avatarBase64 on update as well
    if (!doc.avatar && req.body && req.body.avatarBase64) {
      try {
        const b64 = req.body.avatarBase64;
        const matches = String(b64).match(/^data:(image\/.+?);base64,(.+)$/);
        let buffer;
        let ext = '.jpg';
        if (matches) {
          const mime = matches[1];
          const data = matches[2];
          buffer = Buffer.from(data, 'base64');
          if (mime.indexOf('/') !== -1) ext = '.' + mime.split('/')[1];
        } else {
          buffer = Buffer.from(b64, 'base64');
        }
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const fname = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const full = path.join(uploadsDir, fname);
        fs.writeFileSync(full, buffer);
        // remove old avatar if present
        if (doc.avatar) {
          try {
            const rel = String(doc.avatar).replace(/^\//, '');
            const fullOld = path.join(__dirname, '..', rel);
            if (fs.existsSync(fullOld)) fs.unlinkSync(fullOld);
          } catch (e) {}
        }
        doc.avatar = `/uploads/avatars/${fname}`;
        console.log('personalInfo.updateById - saved base64 avatar to', full);
      } catch (e) {
        console.warn('personalInfo.updateById - failed to save base64 avatar', e.message || e);
      }
    }

    await doc.save();
    console.log('personalInfo.updateById - saved doc avatar=>', doc.avatar);
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('personalInfo.updateById', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Delete by id (also remove avatar file)
exports.deleteById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PersonalInfo.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    if (doc.avatar) {
      try {
        const rel = String(doc.avatar).replace(/^\//, '');
        const full = path.join(__dirname, '..', rel);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      } catch (e) {
        console.warn('Failed to remove avatar during delete', e.message || e);
      }
    }

    await PersonalInfo.deleteOne({ _id: id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('personalInfo.deleteById', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
