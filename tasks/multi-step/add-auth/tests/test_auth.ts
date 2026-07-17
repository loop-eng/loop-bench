import request from 'supertest';
import { app } from '../repo/src/server';
import { itemStore } from '../repo/src/models/item';

describe('Authentication', () => {
  let validToken: string;

  beforeEach(() => {
    itemStore.clear();
  });

  describe('POST /auth/login', () => {
    it('should return JWT for valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.split('.')).toHaveLength(3); // JWT has 3 parts
      validToken = res.body.token;
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'pass' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for missing email or password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@example.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('Protected routes', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'user123' });
      validToken = res.body.token;
    });

    it('should reject GET /items without token', async () => {
      const res = await request(app).get('/items');
      expect(res.status).toBe(401);
    });

    it('should reject POST /items without token', async () => {
      const res = await request(app)
        .post('/items')
        .send({ name: 'Test', value: 10 });
      expect(res.status).toBe(401);
    });

    it('should accept GET /items with valid token', async () => {
      const res = await request(app)
        .get('/items')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should accept POST /items with valid token', async () => {
      const res = await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Auth Item', value: 50 });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Auth Item');
    });

    it('should reject requests with invalid token', async () => {
      const res = await request(app)
        .get('/items')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });

    it('should reject requests with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/items')
        .set('Authorization', 'NotBearer token');
      expect(res.status).toBe(401);
    });

    it('should not require auth for health check', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });
});
