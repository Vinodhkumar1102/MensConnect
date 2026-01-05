const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');

// POST /api/admin/setup  -> create initial admin (call once)
router.post('/setup', controller.setup);

// POST /api/admin/login
router.post('/login', controller.login);

module.exports = router;
