const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../middleware/auth');
const { uploadImages, deleteImage } = require('../controllers/uploadController');

router.route('/upload').post(isAuthenticatedUser, uploadImages).delete(isAuthenticatedUser, deleteImage);

module.exports = router;
