const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Destination = require('../src/models/Destination');
const { generateToken } = require('../src/utils/jwt');

async function createGuide(email, overrides = {}) {
  return User.create({
    name: email.split('@')[0],
    email,
    password: 'Password123',
    role: 'guide',
    verified: true,
    suspended: false,
    languages: [{ code: 'en', name: 'English' }],
    specializations: ['Trekking'],
    pricePerDay: 5000,
    ...overrides
  });
}

function destinationData(slug, guideId) {
  return {
    name: `Destination ${slug}`,
    slug,
    category: 'Nature',
    region: 'Central',
    description: 'A detailed destination description.',
    shortDescription: 'A short destination description.',
    priceRange: 'Rs',
    location: { type: 'Point', coordinates: [85.324, 27.717] },
    addedBy: guideId
  };
}

describe('Paginated directories', () => {
  it('pages guides after applying directory filters', async () => {
    await createGuide('alice-guide@example.com');
    await createGuide('bob-guide@example.com');
    await createGuide('cultural-guide@example.com', { specializations: ['Cultural Tours'] });

    const response = await request(app)
      .get('/api/guides')
      .query({ specialization: 'trekking', language: 'english', page: 2, limit: 1, sort: 'name' })
      .expect(200);

    expect(response.body.total).toBe(2);
    expect(response.body.pages).toBe(2);
    expect(response.body.page).toBe(2);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('bob-guide');
  });

  it('pages a guide submitted places list', async () => {
    const guide = await createGuide('places-guide@example.com');
    const token = generateToken(guide._id, guide.role, guide.email);

    await Destination.create(destinationData('one', guide._id));
    await Destination.create(destinationData('two', guide._id));
    await Destination.create(destinationData('three', guide._id));

    const response = await request(app)
      .get('/api/destinations/my-places')
      .query({ page: 2, limit: 2 })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body.total).toBe(3);
    expect(response.body.pages).toBe(2);
    expect(response.body.page).toBe(2);
    expect(response.body.data).toHaveLength(1);
  });

  it('pages admin place moderation results while preserving matching totals', async () => {
    const admin = await User.create({
      name: 'Places Admin',
      email: 'places-admin@example.com',
      password: 'Password123',
      role: 'admin',
      verified: true
    });
    const token = generateToken(admin._id, admin.role, admin.email);

    await Destination.create(destinationData('admin-one', admin._id));
    await Destination.create(destinationData('admin-two', admin._id));
    await Destination.create(destinationData('admin-three', admin._id));

    const response = await request(app)
      .get('/api/destinations/admin')
      .query({ page: 2, limit: 2, verificationStatus: 'pending' })
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(response.body.total).toBe(3);
    expect(response.body.pages).toBe(2);
    expect(response.body.page).toBe(2);
    expect(response.body.data).toHaveLength(1);
  });
});
