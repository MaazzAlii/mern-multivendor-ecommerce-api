const request = require('supertest');
const app = require('../app');

describe('Product Variants Support', () => {
  let sellerToken;
  let buyerToken;
  let variantProductId;
  let optionMId;
  let optionLId;

  beforeEach(async () => {
    // 1. Register seller & shop
    const sellerRes = await request(app).post('/api/v1/register').send({
      name: 'Variant Seller',
      email: 'seller_variant@example.com',
      password: 'password123',
      role: 'seller',
    });
    sellerToken = sellerRes.body.accessToken;

    await request(app)
      .post('/api/v1/shop/new')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Fashion Shop',
        description: 'Apparel & Variants',
        address: '456 Fashion Ave',
        phoneNumber: '+1234567890',
        zipCode: '10002',
      });

    // 2. Create product with size variants
    const prodRes = await request(app)
      .post('/api/v1/product/new')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Cotton T-Shirt',
        description: 'Premium T-Shirt',
        category: 'Clothing',
        originalPrice: 1500,
        discountPrice: 1200,
        stock: 5,
        variants: [
          {
            name: 'Size',
            options: [
              { label: 'Medium', priceModifier: 0, stock: 5, sku: 'TSHIRT-M' },
              { label: 'Large', priceModifier: 200, stock: 0, sku: 'TSHIRT-L' },
            ],
          },
        ],
      });

    variantProductId = prodRes.body.product._id;
    const variants = prodRes.body.product.variants[0];
    optionMId = variants.options.find((o) => o.label === 'Medium')._id;
    optionLId = variants.options.find((o) => o.label === 'Large')._id;

    // 3. Register buyer
    const buyerRes = await request(app).post('/api/v1/register').send({
      name: 'Variant Buyer',
      email: 'buyer_variant@example.com',
      password: 'password123',
      role: 'buyer',
    });
    buyerToken = buyerRes.body.accessToken;
  });

  it('should require a variant selection for variant products', async () => {
    const res = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ productId: variantProductId, quantity: 1 }],
        paymentMethod: 'Cash On Delivery',
        shippingAddress: {
          address1: '123 Main St',
          city: 'Karachi',
          zipCode: '75500',
          country: 'Pakistan',
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/select a variant option/i);
  });

  it('should successfully checkout in-stock variant and decrement option stock', async () => {
    const res = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ productId: variantProductId, quantity: 1, variantOptionId: optionMId }],
        paymentMethod: 'Cash On Delivery',
        shippingAddress: {
          address1: '123 Main St',
          city: 'Karachi',
          zipCode: '75500',
          country: 'Pakistan',
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.orders[0].items[0].variantLabel).toBe('Size: Medium');

    // Verify option stock decremented to 4
    const prodRes = await request(app).get(`/api/v1/product/${variantProductId}`);
    const mediumOpt = prodRes.body.product.variants[0].options.find((o) => o.label === 'Medium');
    expect(mediumOpt.stock).toBe(4);
  });

  it('should reject checkout for out-of-stock variant option', async () => {
    const res = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ productId: variantProductId, quantity: 1, variantOptionId: optionLId }],
        paymentMethod: 'Cash On Delivery',
        shippingAddress: {
          address1: '123 Main St',
          city: 'Karachi',
          zipCode: '75500',
          country: 'Pakistan',
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/insufficient stock/i);
  });
});
