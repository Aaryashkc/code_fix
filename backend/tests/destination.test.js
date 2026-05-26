const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Destination = require('../src/models/Destination');
const { generateToken } = require('../src/utils/jwt');

function destinationData(slug, overrides = {}) {
  return {
    name: `Destination ${slug}`,
    slug,
    category: 'Nature',
    region: 'Central',
    description: 'A detailed destination description.',
    shortDescription: 'A short destination description.',
    priceRange: 'Rs',
    location: { type: 'Point', coordinates: [85.324, 27.717] },
    ...overrides
  };
}

describe('Destination publication security', () => {
  let guideToken;

  beforeEach(async () => {
    const guide = await User.create({
      name: 'Guide',
      email: 'guide-destination@example.com',
      password: 'Password123',
      role: 'guide',
      verified: true
    });
    guideToken = generateToken(guide._id, guide.role, guide.email);
  });

  it('forces guide submissions into pending unpublished moderation', async () => {
    const response = await request(app)
      .post('/api/destinations')
      .set('Cookie', [`token=${guideToken}`])
      .send(destinationData('guide-submission', {
        published: true,
        verificationStatus: 'approved'
      }))
      .expect(201);

    expect(response.body.data.published).toBe(false);
    expect(response.body.data.verificationStatus).toBe('pending');
    expect(response.body.data.addedBy).toBeTruthy();
  });

  it('does not return unpublished or unapproved destinations publicly', async () => {
    const approved = await Destination.create(destinationData('public', {
      published: true,
      verificationStatus: 'approved'
    }));
    const pending = await Destination.create(destinationData('pending'));
    const rejected = await Destination.create(destinationData('rejected', {
      published: true,
      verificationStatus: 'rejected'
    }));

    const listResponse = await request(app).get('/api/destinations').expect(200);
    expect(listResponse.body.data.map((destination) => destination.slug)).toEqual(['public']);

    await request(app).get(`/api/destinations/${approved._id}`).expect(200);
    await request(app).get(`/api/destinations/${pending._id}`).expect(404);
    await request(app).get(`/api/destinations/${rejected._id}`).expect(404);
  });
});
