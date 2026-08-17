const Stripe = require('stripe');

let stripeInstance = null;

// Lazily initialized so the app can still boot (and COD orders still work)
// even before STRIPE_SECRET_KEY is configured.
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

module.exports = getStripe;
