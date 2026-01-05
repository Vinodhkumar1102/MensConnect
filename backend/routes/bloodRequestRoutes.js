const express = require('express');
const router = express.Router();
const controller = require('../controllers/bloodRequestController');

// List, create, read, update, delete
router.get('/', controller.listAll);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.updateById);
router.delete('/:id', controller.deleteById);

// Send to admin (marks sentToAdmin)
router.post('/:id/send-to-admin', controller.sendToAdmin);

// Reverse geocode stored coordinates for a request and update the doc
router.get('/:id/reverse', controller.reverseGeocodeById);

module.exports = router;
