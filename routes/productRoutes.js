const express = require('express');
const {
  getAllProducts,
  getProductDetails,
  createProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
  createReview,
  getRelatedProducts,
} = require('../controllers/productController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.route('/products').get(getAllProducts);
router.route('/products/mine').get(isAuthenticatedUser, authorizeRoles('seller'), getMyProducts);

// Static "/product/new" MUST come before "/product/:id", or Express matches "new" as an :id value.
router.route('/product/new').post(
  isAuthenticatedUser,
  authorizeRoles('seller'),
  validate([
    body('name').notEmpty().withMessage('Please enter the product name'),
    body('description').notEmpty().withMessage('Please enter a description'),
    body('category').notEmpty().withMessage('Please enter a category'),
    body('discountPrice').isFloat({ min: 0 }).withMessage('Selling price must be a number >= 0'),
    body('stock').isInt({ min: 0 }).withMessage('Stock quantity must be an integer >= 0'),
  ]),
  createProduct
);

router.route('/product/:id').get(getProductDetails);
router
  .route('/product/:id')
  .put(isAuthenticatedUser, authorizeRoles('seller'), updateProduct)
  .delete(isAuthenticatedUser, authorizeRoles('seller'), deleteProduct);
router.route('/product/:id/related').get(getRelatedProducts);
router.route('/product/:id/review').post(
  isAuthenticatedUser,
  validate([
    body('rating').isFloat({ min: 1, max: 5 }).withMessage('rating must be a number between 1 and 5'),
  ]),
  createReview
);

module.exports = router;
