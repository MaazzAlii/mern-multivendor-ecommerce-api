const express = require('express');
const {
  getAllProducts,
  getProductDetails,
  createProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
  createReview,
} = require('../controllers/productController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.route('/products').get(getAllProducts);
router.route('/products/mine').get(isAuthenticatedUser, authorizeRoles('seller'), getMyProducts);

// Static "/product/new" MUST come before "/product/:id", or Express matches "new" as an :id value.
router.route('/product/new').post(isAuthenticatedUser, authorizeRoles('seller'), createProduct);

router.route('/product/:id').get(getProductDetails);
router
  .route('/product/:id')
  .put(isAuthenticatedUser, authorizeRoles('seller'), updateProduct)
  .delete(isAuthenticatedUser, authorizeRoles('seller'), deleteProduct);
router.route('/product/:id/review').post(isAuthenticatedUser, createReview);

module.exports = router;
