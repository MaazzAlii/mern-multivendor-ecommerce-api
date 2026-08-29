const request = require('supertest');
const app = require('../app');

describe('Checkout & Coupon Logic', () => {
  let buyerToken;
  let sellerToken;
  let productId;
  let shopId;

  beforeEach(async () => {
    // 1. Create seller, shop, product, coupon
    const sellerRes = await request(app).post('/api/v1/register').send({
      name: 'Seller',
      email: 'seller_checkout@example.com',
      password: 'password123',
      role: 'seller',
    });
    sellerToken = sellerRes.body.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shop/new')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Checkout Shop',
        description: 'Shop for checkout testing',
        address: '123 Market St',
        phoneNumber: '+1234567890',
        zipCode: '10001',
      });
    shopId = shopRes.body.shop._id;

    const prodRes = await request(app)
      .post('/api/v1/product/new')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Keyboard',
        description: 'Mechanical Keyboard',
        category: 'Electronics',
        originalPrice: 1000,
        discountPrice: 800,
        stock: 50,
      });
    productId = prodRes.body.product._id;

    await request(app)
      .post('/api/v1/coupon/new')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'SAVE10',
        discountPercent: 10,
        minAmount: 500,
      });

    // 2. Create buyer
    const buyerRes = await request(app).post('/api/v1/register').send({
      name: 'Buyer',
      email: 'buyer_checkout@example.com',
      password: 'password123',
      role: 'buyer',
    });
    buyerToken = buyerRes.body.accessToken;
  });

  it('should checkout with Cash On Delivery and apply 10% coupon correctly', async () => {
    const res = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'Cash On Delivery',
        couponCode: 'SAVE10',
        shippingAddress: {
          address1: '123 Main St',
          city: 'Karachi',
          zipCode: '75500',
          country: 'Pakistan',
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.orders.length).toBe(1);

    const order = res.body.orders[0];
    // ItemsPrice = 800 * 1 = 800. Discount = 10% of 800 = 80. Shipping = 150. Total = 800 - 80 + 150 = 870.
    expect(order.itemsPrice).toBe(800);
    expect(order.discountAmount).toBe(80);
    expect(order.shippingPrice).toBe(150);
    expect(order.totalPrice).toBe(870);
  });

  it('should reject coupon if minimum order amount is not met', async () => {
    // Create low price product
    const lowProdRes = await request(app)
      .post('/api/v1/product/new')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Cable',
        description: 'USB Cable',
        category: 'Electronics',
        originalPrice: 200,
        discountPrice: 150,
        stock: 50,
      });

    const res = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ productId: lowProdRes.body.product._id, quantity: 1 }],
        paymentMethod: 'Cash On Delivery',
        couponCode: 'SAVE10',
        shippingAddress: {
          address1: '123 Main St',
          city: 'Karachi',
          zipCode: '75500',
          country: 'Pakistan',
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/minimum order/i);
  });
});
