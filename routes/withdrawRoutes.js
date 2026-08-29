const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const {
  createWithdrawRequest,
  getMyWithdrawals,
  getAllWithdrawals,
  updateWithdrawStatus,
} = require('../controllers/withdrawController');

router.route('/withdraw/new').post(isAuthenticatedUser, authorizeRoles('seller'), createWithdrawRequest);
router.route('/withdraws/mine').get(isAuthenticatedUser, authorizeRoles('seller'), getMyWithdrawals);

router.route('/admin/withdraws').get(isAuthenticatedUser, authorizeRoles('admin'), getAllWithdrawals);
router.route('/admin/withdraw/:id').put(isAuthenticatedUser, authorizeRoles('admin'), updateWithdrawStatus);

module.exports = router;
