const crypto = require('crypto');
const request = require('supertest');
const axios = require('axios');
const app = require('../src/app');
const Booking = require('../src/models/Booking');
const Commission = require('../src/models/Commission');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');

jest.mock('axios');

describe('Payment verification security', () => {
  let tourist;
  let guide;
  let admin;
  let touristToken;
  let guideToken;
  let adminToken;
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
    admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'Password123',
      role: 'admin',
      verified: true
    });

    touristToken = generateToken(tourist._id, tourist.role, tourist.email);
    guideToken = generateToken(guide._id, guide.role, guide.email);
    adminToken = generateToken(admin._id, admin.role, admin.email);
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

  it('successfully verifies a correctly signed eSewa payment with auth context', async () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'COMPLETE' } });

    const response = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', [`token=${touristToken}`])
      .send({ encodedData: signedCallback() })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Payment verified successfully');
    expect((await Booking.findById(booking._id)).paymentStatus).toBe('paid');
  });

  it('successfully verifies a correctly signed eSewa payment without auth context (guest context)', async () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'COMPLETE' } });

    const response = await request(app)
      .post('/api/payments/verify')
      .send({ encodedData: signedCallback() })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Payment verified successfully');
    expect((await Booking.findById(booking._id)).paymentStatus).toBe('paid');
  });

  it('successfully verifies a correctly signed eSewa payment with decimals in total_amount', async () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'COMPLETE' } });

    // Mock a callback with a float value '2000.00'
    const signedFieldNames = 'transaction_uuid,total_amount,product_code,status';
    const paymentData = {
      transaction_uuid: booking.paymentPidx,
      transaction_code: 'provider-code',
      status: 'COMPLETE',
      total_amount: '2000.00',
      product_code: process.env.ESEWA_PRODUCT_CODE,
      signed_field_names: signedFieldNames,
    };
    const message = `transaction_uuid=${paymentData.transaction_uuid},total_amount=2000.00,product_code=${paymentData.product_code},status=${paymentData.status}`;
    paymentData.signature = crypto
      .createHmac('sha256', process.env.ESEWA_SECRET_KEY)
      .update(message)
      .digest('base64');
    
    // Construct raw JSON string with exact decimal representation
    const jsonStr = `{"transaction_uuid":"${paymentData.transaction_uuid}","transaction_code":"provider-code","status":"COMPLETE","total_amount":2000.00,"product_code":"${paymentData.product_code}","signed_field_names":"${signedFieldNames}","signature":"${paymentData.signature}"}`;
    const encodedData = Buffer.from(jsonStr).toString('base64');

    const response = await request(app)
      .post('/api/payments/verify')
      .send({ encodedData })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect((await Booking.findById(booking._id)).paymentStatus).toBe('paid');
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

  it('creates earnings and pending payout records when a guide confirms cash', async () => {
    booking.paymentMethod = 'cash';
    await booking.save();

    await request(app)
      .post('/api/payments/confirm-cash')
      .set('Cookie', [`token=${guideToken}`])
      .send({ bookingId: booking._id })
      .expect(200);

    const commission = await Commission.findOne({ booking: booking._id });
    expect(commission).toBeTruthy();
    expect(commission.guide.toString()).toBe(guide._id.toString());
    expect(commission.bookingAmount).toBe(2000);
    expect(commission.commissionAmount).toBe(300);
    expect(commission.guideEarning).toBe(1700);

    const guideEarnings = await request(app)
      .get('/api/commissions/my')
      .set('Cookie', [`token=${guideToken}`])
      .expect(200);
    expect(guideEarnings.body.data).toHaveLength(1);
    expect(guideEarnings.body.data[0].guideEarning).toBe(1700);

    const pendingPayouts = await request(app)
      .get('/api/payouts/pending')
      .set('Cookie', [`token=${adminToken}`])
      .expect(200);
    expect(pendingPayouts.body.data.totalPending).toBe(1700);
    expect(pendingPayouts.body.data.guides[0].commissionCount).toBe(1);
  });

  it('backfills old cash-confirmed bookings into the admin payout queue', async () => {
    booking.paymentMethod = 'cash';
    booking.paymentStatus = 'paid';
    booking.paymentDate = new Date();
    await booking.save();

    expect(await Commission.countDocuments()).toBe(0);

    const response = await request(app)
      .get('/api/payouts/pending')
      .set('Cookie', [`token=${adminToken}`])
      .expect(200);

    expect(response.body.data.totalPending).toBe(1700);
    expect(response.body.data.guides[0].guide._id).toBe(guide._id.toString());
    expect(await Commission.countDocuments()).toBe(1);
  });
});
