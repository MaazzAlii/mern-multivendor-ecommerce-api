const request = require('supertest');
const app = require('../app');

describe('Product Endpoints', () => {
  let sellerToken;

  beforeEach(async () => {
    const regRes = await request(app).post('/api/v1/register').send({
      name: 'Seller User',
      email: 'seller@example.com',
      password: 'password123',
      role: 'seller',
    });
    sellerToken = regRes.body.accessToken;
  });

  it('should fail product creation if seller has no shop yet', async () => {
    const res = await request(app)
      .post('/api/v1/product/new')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Wireless Earbuds',
        description: 'Noise cancelling earbuds',
        category: 'Electronics',
        originalPrice: 100,
        discountPrice: 80,
        stock: 10,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Create your shop/i);
  });

  it('should succeed creating product after creating a shop', async () => {
    // 1. Create shop
    await request(app)
      .post('/api/v1/shop/new')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Tech Gadgets Store',
        description: 'All tech accessories',
        address: '123 Tech Street',
        phoneNumber: '+1234567890',
        zipCode: '10001',
      });

    // 2. Create product
    const productRes = await request(app)
      .post('/api/v1/product/new')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        category: 'Electronics',
        originalPrice: 50,
        discountPrice: 40,
        stock: 25,
      });

    expect(productRes.statusCode).toBe(201);
    expect(productRes.body.success).toBe(true);
    expect(productRes.body.product.name).toBe('Wireless Mouse');

    // 3. Public products list
    const listRes = await request(app).get('/api/v1/products');
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.products.length).toBeGreaterThan(0);
    expect(listRes.body.products[0].name).toBe('Wireless Mouse');
  });
});
