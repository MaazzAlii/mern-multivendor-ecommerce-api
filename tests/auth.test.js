const request = require('supertest');
const app = require('../app');

describe('Auth Endpoints', () => {
  it('should register a new user and return tokens', async () => {
    const res = await request(app).post('/api/v1/register').send({
      name: 'Test Buyer',
      email: 'buyer@example.com',
      password: 'password123',
      role: 'buyer',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('buyer@example.com');
    expect(res.body.accessToken).toBeDefined();
  });

  it('should fail registration with duplicate email', async () => {
    await request(app).post('/api/v1/register').send({
      name: 'User One',
      email: 'duplicate@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/v1/register').send({
      name: 'User Two',
      email: 'duplicate@example.com',
      password: 'password123',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('should login user with correct credentials', async () => {
    await request(app).post('/api/v1/register').send({
      name: 'Login User',
      email: 'login@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/v1/login').send({
      email: 'login@example.com',
      password: 'password123',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should fail login with incorrect password', async () => {
    await request(app).post('/api/v1/register').send({
      name: 'Login User 2',
      email: 'login2@example.com',
      password: 'correctpassword',
    });

    const res = await request(app).post('/api/v1/login').send({
      email: 'login2@example.com',
      password: 'wrongpassword',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
