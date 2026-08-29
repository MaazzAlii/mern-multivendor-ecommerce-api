const express = require('express');
const {
  checkout,
  getOrdersByGroup,
  myOrders,
  getShopOrders,
  updateOrderStatus,
  cancelOrder,
  getShopAnalytics,
} = require('../controllers/orderController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.route('/checkout').post(
  isAuthenticatedUser,
  validate([
    body('items').isArray({ min: 1 }).withMessage('items array is required and cannot be empty'),
    body('paymentMethod').isIn(['Card', 'Cash On Delivery']).withMessage('paymentMethod must be "Card" or "Cash On Delivery"'),
    body('shippingAddress.address1').notEmpty().withMessage('shippingAddress.address1 is required'),
    body('shippingAddress.city').notEmpty().withMessage('shippingAddress.city is required'),
    body('shippingAddress.zipCode').notEmpty().withMessage('shippingAddress.zipCode is required'),
    body('shippingAddress.country').notEmpty().withMessage('shippingAddress.country is required'),
  ]),
  checkout
);

router.route('/orders/me').get(isAuthenticatedUser, myOrders);
router.route('/orders/shop').get(isAuthenticatedUser, authorizeRoles('seller'), getShopOrders);
router.route('/orders/group/:checkoutGroupId').get(isAuthenticatedUser, getOrdersByGroup);
router.route('/analytics/shop').get(isAuthenticatedUser, authorizeRoles('seller'), getShopAnalytics);

router.route('/order/:id/cancel').put(isAuthenticatedUser, cancelOrder);
router.route('/order/:id/status').put(isAuthenticatedUser, authorizeRoles('seller'), updateOrderStatus);

module.exports = router;
