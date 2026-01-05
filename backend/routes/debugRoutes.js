const express = require('express');
const router = express.Router();
const controller = require('../controllers/debugController');

// GET /api/debug/db
router.get('/db', controller.status);

module.exports = router;
