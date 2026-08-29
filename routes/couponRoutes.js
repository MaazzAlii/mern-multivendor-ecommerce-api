const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const {
  createCoupon,
  getMyCoupons,
  deleteCoupon,
  getCouponValue,
} = require('../controllers/couponController');

router.route('/coupon/new').post(isAuthenticatedUser, authorizeRoles('seller'), createCoupon);
router.route('/coupons/mine').get(isAuthenticatedUser, authorizeRoles('seller'), getMyCoupons);
router.route('/coupon/:id').delete(isAuthenticatedUser, authorizeRoles('seller'), deleteCoupon);
router.route('/coupon/value/:name').get(getCouponValue);

module.exports = router;
