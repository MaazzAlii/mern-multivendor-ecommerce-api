const express = require('express');
const cors = require('cors');

const errorMiddleware = require('./middleware/error');
const connectDatabase = require('./config/db');

const webhookRoutes = require('./routes/webhookRoutes');
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require('./routes/shopRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());

// Connect to MongoDB on each request (serverless-safe).
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

// IMPORTANT: the Stripe webhook route needs the raw request body to verify its
// signature, so it's mounted here — before express.json() — with express.raw().
// If this were mounted after express.json(), the body would already be parsed
// into an object and Stripe's signature check would fail every time.
app.use('/api/v1', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Multi-Vendor E-commerce API is running',
    routes: {
      seed: 'GET or POST /api/v1/seed',
      auth: '/api/v1 (register, login, me, me/address)',
      shops: '/api/v1/shops, /api/v1/shop/:id, /api/v1/shop/new, /api/v1/shop/mine',
      products: '/api/v1/products, /api/v1/product/:id, /api/v1/product/new, /api/v1/products/mine',
      checkout: '/api/v1/checkout',
      orders: '/api/v1/orders/me, /api/v1/orders/shop, /api/v1/orders/group/:checkoutGroupId, /api/v1/order/:id/status',
      admin: '/api/v1/admin/stats, /api/v1/admin/users, /api/v1/admin/shops, /api/v1/admin/products, /api/v1/admin/orders',
    },
  });
});

const seedDatabase = require('./seed');
app.all('/api/v1/seed', async (req, res, next) => {
  try {
    const result = await seedDatabase();
    res.status(200).json({
      success: true,
      message: 'Database seeded successfully with demo users, shops, products, and orders',
      result,
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/v1', authRoutes);
app.use('/api/v1', shopRoutes);
app.use('/api/v1', productRoutes);
app.use('/api/v1', orderRoutes);
app.use('/api/v1', adminRoutes);

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found - ${req.originalUrl}` });
});

app.use(errorMiddleware);

module.exports = app;
