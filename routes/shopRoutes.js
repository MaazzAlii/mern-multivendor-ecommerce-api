const express = require('express');
const {
  getAllShops,
  getShopDetails,
  createShop,
  getMyShop,
  updateMyShop,
} = require('../controllers/shopController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.route('/shops').get(getAllShops);

// Static routes MUST come before /shop/:id, or Express matches "mine"/"new" as an :id value.
router.route('/shop/new').post(isAuthenticatedUser, authorizeRoles('seller'), createShop);
router
  .route('/shop/mine')
  .get(isAuthenticatedUser, authorizeRoles('seller'), getMyShop)
  .put(isAuthenticatedUser, authorizeRoles('seller'), updateMyShop);

router.route('/shop/:id').get(getShopDetails);

module.exports = router;
