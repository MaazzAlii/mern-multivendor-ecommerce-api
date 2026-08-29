const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../middleware/auth');
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/wishlistController');

router.route('/wishlist').get(isAuthenticatedUser, getWishlist);
router
  .route('/wishlist/:productId')
  .post(isAuthenticatedUser, addToWishlist)
  .delete(isAuthenticatedUser, removeFromWishlist);

module.exports = router;
