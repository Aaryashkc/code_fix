const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');

describe('Admin analytics', () => {
  let adminToken;

  beforeEach(async () => {
    const admin = await User.create({
      name: 'Analytics Admin',
      email: 'analytics-admin@example.com',
      password: 'Password123',
      role: 'admin',
      verified: true
    });

    adminToken = generateToken(admin._id, admin.role, admin.email);
  });

  it('returns an admin analytics payload with zero-filled monthly series', async () => {
    const response = await request(app)
      .get('/api/analytics')
      .set('Cookie', [`token=${adminToken}`])
      .expect(200);

    expect(response.body.data.bookingsData).toHaveLength(6);
    expect(response.body.data.revenueData).toHaveLength(6);
    expect(response.body.data.userGrowthData).toHaveLength(6);
    expect(response.body.data.summary).toMatchObject({
      totalBookings: 0,
      totalUsers: 1,
      totalRevenue: 0,
      pendingBookings: 0,
      completedBookings: 0,
      paidBookings: 0,
      averageBookingValue: 0
    });
  });

  it('rejects non-admin analytics access', async () => {
    const tourist = await User.create({
      name: 'Tourist',
      email: 'analytics-tourist@example.com',
      password: 'Password123',
      role: 'tourist',
      verified: true
    });
    const touristToken = generateToken(tourist._id, tourist.role, tourist.email);

    await request(app)
      .get('/api/analytics')
      .set('Cookie', [`token=${touristToken}`])
      .expect(403);
  });
});
