const express = require('express');
const { stripeWebhook } = require('../controllers/orderController');

const router = express.Router();

// Note: this route is mounted in app.js BEFORE express.json(), with express.raw()
// instead, because Stripe's webhook signature verification requires the exact
// raw request body bytes — a JSON-parsed/re-serialized body would fail verification.
router.route('/webhook/stripe').post(stripeWebhook);

module.exports = router;
