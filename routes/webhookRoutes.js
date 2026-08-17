const express = require('express');
const { stripeWebhook } = require('../controllers/orderController');

const router = express.Router();

// Stripe's webhook signature verification requires the exact raw request body bytes,
// so express.raw() is applied specifically to this endpoint.
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;
