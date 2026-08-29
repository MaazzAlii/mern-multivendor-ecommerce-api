const request = require('supertest');
const app = require('../app');

describe('Auth & Role Authorization Middleware', () => {
  it('should return 401 when accessing protected route without a token', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 when accessing seller-only route with buyer token', async () => {
    const buyerRes = await request(app).post('/api/v1/register').send({
      name: 'Buyer User',
      email: 'buyer_mid@example.com',
      password: 'password123',
      role: 'buyer',
    });
    const buyerToken = buyerRes.body.accessToken;

    const res = await request(app)
      .get('/api/v1/orders/shop')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not allowed/i);
  });
});
