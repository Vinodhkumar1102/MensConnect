const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadAvatar');
const controller = require('../controllers/personalInfoController');

// Only run multer when request is multipart/form-data
function conditionalUpload(req, res, next) {
	const ct = req.headers['content-type'] || '';
	if (ct.indexOf('multipart/form-data') !== -1) {
		return upload.single('avatar')(req, res, next);
	}
	return next();
}

// GET list
router.get('/', controller.listAll);
// POST create (accepts JSON or multipart)
router.post('/', conditionalUpload, controller.createOrUpdate);
// GET by id
router.get('/:id', controller.getById);
// PUT update by id (multipart optional avatar)
router.put('/:id', upload.single('avatar'), controller.updateById);
// DELETE by id
router.delete('/:id', controller.deleteById);

module.exports = router;
