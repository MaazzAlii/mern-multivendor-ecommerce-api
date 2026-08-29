const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const {
  createCoupon,
  getMyCoupons,
  deleteCoupon,
  getCouponValue,
} = require('../controllers/couponController');

const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.route('/coupon/new').post(
  isAuthenticatedUser,
  authorizeRoles('seller'),
  validate([
    body('name').notEmpty().withMessage('Coupon code is required'),
    body('discountPercent').isFloat({ min: 1, max: 100 }).withMessage('discountPercent must be a number between 1 and 100'),
  ]),
  createCoupon
);
router.route('/coupons/mine').get(isAuthenticatedUser, authorizeRoles('seller'), getMyCoupons);
router.route('/coupon/:id').delete(isAuthenticatedUser, authorizeRoles('seller'), deleteCoupon);
router.route('/coupon/value/:name').get(getCouponValue);

module.exports = router;
