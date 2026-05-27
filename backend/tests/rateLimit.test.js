const request = require('supertest');

describe('development rate limiting', () => {
  let originalNodeEnv;
  let originalRateLimitMax;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalRateLimitMax = process.env.RATE_LIMIT_MAX;
    process.env.NODE_ENV = 'development';
    process.env.RATE_LIMIT_MAX = '1';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalRateLimitMax === undefined) {
      delete process.env.RATE_LIMIT_MAX;
    } else {
      process.env.RATE_LIMIT_MAX = originalRateLimitMax;
    }
  });

  it('does not block repeated local API requests in development', async () => {
    jest.resetModules();
    const app = require('../src/app');

    await request(app).get('/api/nonexistent').expect(404);
    await request(app).get('/api/nonexistent').expect(404);
  });
});
