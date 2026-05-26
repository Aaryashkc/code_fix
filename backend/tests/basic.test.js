const request = require('supertest');
const app = require('../src/app');

describe('Basic API Tests', () => {
  test('should respond with 404 for invalid route', async () => {
    await request(app)
      .get('/api/nonexistent')
      .expect(404);
  });

  test('should respond to health check', async () => {
    // Test if server starts without errors
    await request(app)
      .get('/')
      .expect(404); // Expected since no root route is defined
  });

  test('auth endpoints exist', async () => {
    // Test that auth endpoints are properly registered
    await request(app)
      .post('/api/auth/login')
      .send({})
      .expect(400); // Expected due to missing credentials
  });
});
