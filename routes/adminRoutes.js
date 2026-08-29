const express = require('express');
const {
  getDashboardStats,
  getAllUsers,
  deleteUser,
  getAllShopsAdmin,
  deleteShopAdmin,
  getAllProductsAdmin,
} = require('../controllers/adminController');
const { getAllOrdersAdmin } = require('../controllers/orderController');
const { toggleReviewVisibility } = require('../controllers/productController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use('/admin', isAuthenticatedUser, authorizeRoles('admin'));

router.route('/admin/stats').get(getDashboardStats);
router.route('/admin/users').get(getAllUsers);
router.route('/admin/user/:id').delete(deleteUser);
router.route('/admin/shops').get(getAllShopsAdmin);
router.route('/admin/shop/:id').delete(deleteShopAdmin);
router.route('/admin/products').get(getAllProductsAdmin);
router.route('/admin/orders').get(getAllOrdersAdmin);
router.route('/admin/product/:productId/review/:reviewId/visibility').put(toggleReviewVisibility);

module.exports = router;
