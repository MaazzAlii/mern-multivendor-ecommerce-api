const express = require('express');
const {
  checkout,
  getOrdersByGroup,
  myOrders,
  getShopOrders,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.route('/checkout').post(isAuthenticatedUser, checkout);

router.route('/orders/me').get(isAuthenticatedUser, myOrders);
router.route('/orders/shop').get(isAuthenticatedUser, authorizeRoles('seller'), getShopOrders);
router.route('/orders/group/:checkoutGroupId').get(isAuthenticatedUser, getOrdersByGroup);

router.route('/order/:id/cancel').put(isAuthenticatedUser, cancelOrder);
router.route('/order/:id/status').put(isAuthenticatedUser, authorizeRoles('seller'), updateOrderStatus);

module.exports = router;
