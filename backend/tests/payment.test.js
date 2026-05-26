const crypto = require('crypto');
const request = require('supertest');
const axios = require('axios');
const app = require('../src/app');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');

jest.mock('axios');

describe('Payment verification security', () => {
  let tourist;
  let guide;
  let touristToken;
  let guideToken;
  let booking;

  beforeEach(async () => {
    axios.get.mockReset();

    tourist = await User.create({
      name: 'Tourist',
      email: 'tourist@example.com',
      password: 'Password123',
      role: 'tourist',
      verified: true
    });
    guide = await User.create({
      name: 'Guide',
      email: 'guide@example.com',
      password: 'Password123',
      role: 'guide',
      verified: true
    });

    touristToken = generateToken(tourist._id, tourist.role, tourist.email);
    guideToken = generateToken(guide._id, guide.role, guide.email);
    booking = await Booking.create({
      tourist: tourist._id,
      guide: guide._id,
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2026-06-01T00:00:00Z'),
      numberOfDays: 1,
      packageType: 'Full Day Adventure',
      groupSize: 1,
      offeredPrice: 2000,
      totalPrice: 2000,
      status: 'confirmed',
      paymentStatus: 'pending',
      paymentMethod: 'esewa',
      paymentPidx: 'payment-transaction-id'
    });
  });

  const encodeCallback = (overrides = {}) => {
    const paymentData = {
      transaction_uuid: booking.paymentPidx,
      transaction_code: 'provider-code',
      status: 'COMPLETE',
      total_amount: '2000',
      product_code: process.env.ESEWA_PRODUCT_CODE,
      ...overrides
    };
    return Buffer.from(JSON.stringify(paymentData)).toString('base64');
  };

  const signedCallback = (overrides = {}) => {
    const signedFieldNames = 'transaction_uuid,total_amount,product_code,status';
    const paymentData = {
      transaction_uuid: booking.paymentPidx,
      transaction_code: 'provider-code',
      status: 'COMPLETE',
      total_amount: '2000',
      product_code: process.env.ESEWA_PRODUCT_CODE,
      signed_field_names: signedFieldNames,
      ...overrides
    };
    const message = signedFieldNames
      .split(',')
      .map((field) => `${field}=${paymentData[field]}`)
      .join(',');
    paymentData.signature = crypto
      .createHmac('sha256', process.env.ESEWA_SECRET_KEY)
      .update(message)
      .digest('base64');
    return Buffer.from(JSON.stringify(paymentData)).toString('base64');
  };

  it('rejects an unsigned callback even when it claims payment completed', async () => {
    const response = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', [`token=${touristToken}`])
      .send({ encodedData: encodeCallback() })
      .expect(400);

    expect(response.body.message).toBe('Signed payment data is required');
    expect(axios.get).not.toHaveBeenCalled();
    expect((await Booking.findById(booking._id)).paymentStatus).toBe('pending');
  });

  it('does not use callback status when provider status cannot be confirmed', async () => {
    axios.get.mockRejectedValueOnce(new Error('provider unavailable'));

    const response = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', [`token=${touristToken}`])
      .send({ encodedData: signedCallback() })
      .expect(502);

    expect(response.body.message).toContain('Unable to confirm payment');
    expect((await Booking.findById(booking._id)).paymentStatus).toBe('pending');
  });

  it('rejects a correctly signed payment for the wrong amount', async () => {
    const response = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', [`token=${touristToken}`])
      .send({ encodedData: signedCallback({ total_amount: '1' }) })
      .expect(400);

    expect(response.body.message).toBe('Payment amount does not match booking total');
    expect(axios.get).not.toHaveBeenCalled();
    expect((await Booking.findById(booking._id)).paymentStatus).toBe('pending');
  });

  it('does not let a guide mark an eSewa booking as paid cash', async () => {
    const response = await request(app)
      .post('/api/payments/confirm-cash')
      .set('Cookie', [`token=${guideToken}`])
      .send({ bookingId: booking._id })
      .expect(400);

    expect(response.body.message).toContain('Cash must be selected');
    expect((await Booking.findById(booking._id)).paymentStatus).toBe('pending');
  });
});
