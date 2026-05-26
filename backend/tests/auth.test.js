const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const OTPModel = require('../src/models/OTP');
const { hashOTP } = require('../src/utils/otp');

describe('Authentication Security Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await OTPModel.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
    await OTPModel.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should enforce default tourist role and reject role escalation', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        role: 'admin' // Attempt to escalate
      };

      // First verify email with OTP
      await request(app)
        .post('/api/auth/send-registration-otp')
        .send({ email: userData.email });

      const otpRecord = await OTPModel.findOne({ email: userData.email });
      await OTPModel.updateOne({ _id: otpRecord._id }, { 
        isUsed: true, 
        verified: true 
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Verify role was enforced to 'tourist'
      expect(response.body.user.role).toBe('tourist');
      
      // Verify user was created with correct role in database
      const user = await User.findOne({ email: userData.email });
      expect(user.role).toBe('tourist');
    });

    it('should prevent registration without email verification', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('Email not verified');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a verified user for login tests
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        role: 'tourist',
        verified: true
      });
      await user.save();
    });

    it('should reject login for suspended users', async () => {
      // Suspend the user
      await User.updateOne({ email: 'test@example.com' }, { suspended: true });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(403);

      expect(response.body.message).toContain('Account suspended');
    });

    it('should reject login for unverified users (non-admin)', async () => {
      // Unverify the user
      await User.updateOne({ email: 'test@example.com' }, { verified: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(403);

      expect(response.body.message).toContain('Email not verified');
    });

    it('should reject login for unverified admin users', async () => {
      // Create unverified admin
      await User.deleteMany({});
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'Password123',
        role: 'admin',
        verified: false
      });
      await admin.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123'
        })
        .expect(403);

      expect(response.body.message).toContain('Email not verified');
    });

    it('should return a cookie session without exposing a bearer token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(200);

      expect(response.headers['set-cookie'][0]).toContain('token=');
      expect(response.body.token).toBeUndefined();
    });

    it('should reject an already issued session after suspension', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123'
      }).expect(200);

      await User.updateOne({ email: 'test@example.com' }, { suspended: true });

      const response = await agent.get('/api/auth/me').expect(403);
      expect(response.body.message).toContain('Account suspended');
    });

    it('should reject an already issued session after verification is revoked', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123'
      }).expect(200);

      await User.updateOne({ email: 'test@example.com' }, { verified: false });

      const response = await agent.get('/api/auth/me').expect(403);
      expect(response.body.message).toContain('Email not verified');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should create only a cookie session for OTP login', async () => {
      await User.create({
        name: 'OTP User',
        email: 'otp@example.com',
        password: 'Password123',
        role: 'tourist',
        verified: true
      });

      await request(app).post('/api/auth/request-otp').send({ email: 'otp@example.com' });
      const otpRecord = await OTPModel.findOne({ email: 'otp@example.com' });
      await OTPModel.updateOne({ _id: otpRecord._id }, { otp: hashOTP('123456') });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'otp@example.com', otp: '123456' })
        .expect(200);

      expect(response.headers['set-cookie'][0]).toContain('token=');
      expect(response.body.token).toBeUndefined();
    });

    it('should reject OTP login for suspended users', async () => {
      // Create suspended user
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        role: 'tourist',
        verified: true,
        suspended: true
      });
      await user.save();

      // Request OTP
      await request(app)
        .post('/api/auth/request-otp')
        .send({ email: 'test@example.com' });

      // Get OTP from database
      const otpRecord = await OTPModel.findOne({ email: 'test@example.com' });
      expect(otpRecord).toBeTruthy();
      await OTPModel.updateOne(
        { _id: otpRecord._id },
        { otp: hashOTP('123456') }
      );
      const otp = '123456'; // Default OTP for testing

      // Try to login with OTP
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: otp
        })
        .expect(403);

      expect(response.body.message).toContain('Account suspended');
    });
  });
});
