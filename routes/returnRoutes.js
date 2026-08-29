const express = require('express');
const {
  requestReturn,
  getMyReturns,
  getShopReturns,
  getAllReturns,
  updateReturnStatus,
} = require('../controllers/returnController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.route('/return/new').post(isAuthenticatedUser, requestReturn);
router.route('/returns/mine').get(isAuthenticatedUser, getMyReturns);
router.route('/returns/shop').get(isAuthenticatedUser, authorizeRoles('seller'), getShopReturns);
router.route('/admin/returns').get(isAuthenticatedUser, authorizeRoles('admin'), getAllReturns);
router.route('/return/:id').put(isAuthenticatedUser, authorizeRoles('seller', 'admin'), updateReturnStatus);

module.exports = router;
