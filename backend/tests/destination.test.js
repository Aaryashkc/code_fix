const request = require('supertest');
jest.mock('../src/middleware/upload', () => {
  const actual = jest.requireActual('../src/middleware/upload');
  return {
    ...actual,
    uploadToCloudinary: jest.fn(),
    deleteFromCloudinary: jest.fn().mockResolvedValue(undefined)
  };
});

const app = require('../src/app');
const User = require('../src/models/User');
const Destination = require('../src/models/Destination');
const { generateToken } = require('../src/utils/jwt');
const { uploadToCloudinary, deleteFromCloudinary } = require('../src/middleware/upload');

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
  let otherGuideToken;
  let adminToken;

  beforeEach(async () => {
    uploadToCloudinary.mockReset();
    deleteFromCloudinary.mockReset().mockResolvedValue(undefined);
    const guide = await User.create({
      name: 'Guide',
      email: 'guide-destination@example.com',
      password: 'Password123',
      role: 'guide',
      verified: true
    });
    guideToken = generateToken(guide._id, guide.role, guide.email);

    const otherGuide = await User.create({
      name: 'Other Guide',
      email: 'other-guide-destination@example.com',
      password: 'Password123',
      role: 'guide',
      verified: true
    });
    otherGuideToken = generateToken(otherGuide._id, otherGuide.role, otherGuide.email);

    const admin = await User.create({
      name: 'Admin',
      email: 'admin-destination@example.com',
      password: 'Password123',
      role: 'admin',
      verified: true
    });
    adminToken = generateToken(admin._id, admin.role, admin.email);
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

  it('returns all moderation statuses to admins while denying non-admin access', async () => {
    await Destination.create(destinationData('approved-admin-list', {
      published: true,
      verificationStatus: 'approved'
    }));
    await Destination.create(destinationData('pending-admin-list'));
    await Destination.create(destinationData('rejected-admin-list', {
      verificationStatus: 'rejected'
    }));
    await Destination.create(destinationData('eastern-admin-list', {
      region: 'Eastern',
      published: true,
      verificationStatus: 'approved'
    }));

    const response = await request(app)
      .get('/api/destinations/admin')
      .set('Cookie', [`token=${adminToken}`])
      .expect(200);

    expect(response.body.data.map((destination) => destination.slug).sort()).toEqual([
      'approved-admin-list',
      'eastern-admin-list',
      'pending-admin-list',
      'rejected-admin-list'
    ]);

    const centralResponse = await request(app)
      .get('/api/destinations/admin?region=Central')
      .set('Cookie', [`token=${adminToken}`])
      .expect(200);
    expect(centralResponse.body.data.map((destination) => destination.slug)).not.toContain('eastern-admin-list');

    const statsResponse = await request(app)
      .get('/api/destinations/stats')
      .set('Cookie', [`token=${adminToken}`])
      .expect(200);
    expect(statsResponse.body.data.pendingByRegion).toEqual(
      expect.arrayContaining([{ _id: 'Central', count: 1 }])
    );

    await request(app)
      .get('/api/destinations/admin')
      .set('Cookie', [`token=${guideToken}`])
      .expect(403);
  });

  it('allows admins to edit moderated destinations', async () => {
    const destination = await Destination.create(destinationData('admin-edit-target'));

    const response = await request(app)
      .put(`/api/destinations/${destination._id}`)
      .set('Cookie', [`token=${adminToken}`])
      .send({
        name: 'Updated Destination',
        shortDescription: 'Updated short description.'
      })
      .expect(200);

    expect(response.body.data.name).toBe('Updated Destination');
    expect(response.body.data.shortDescription).toBe('Updated short description.');
  });

  it('lets admins upload, reorder, and remove gallery images', async () => {
    const destination = await Destination.create(destinationData('gallery', {
      published: true,
      verificationStatus: 'approved'
    }));
    uploadToCloudinary
      .mockResolvedValueOnce({ public_id: 'places/cover', secure_url: 'https://cloud.test/cover.jpg' })
      .mockResolvedValueOnce({ public_id: 'places/detail', secure_url: 'https://cloud.test/detail.jpg' });

    const uploadResponse = await request(app)
      .post(`/api/destinations/${destination._id}/media`)
      .set('Cookie', [`token=${adminToken}`])
      .attach('images', Buffer.from('cover'), { filename: 'cover.jpg', contentType: 'image/jpeg' })
      .attach('images', Buffer.from('detail'), { filename: 'detail.png', contentType: 'image/png' })
      .expect(201);

    expect(uploadResponse.body.data.images).toEqual([
      'https://cloud.test/cover.jpg',
      'https://cloud.test/detail.jpg'
    ]);
    expect(uploadResponse.body.data.media[0].publicId).toBe('places/cover');

    const reorderResponse = await request(app)
      .put(`/api/destinations/${destination._id}/media`)
      .set('Cookie', [`token=${adminToken}`])
      .send({ media: [...uploadResponse.body.data.media].reverse() })
      .expect(200);
    expect(reorderResponse.body.data.images[0]).toBe('https://cloud.test/detail.jpg');

    const removeResponse = await request(app)
      .delete(`/api/destinations/${destination._id}/media/1`)
      .set('Cookie', [`token=${adminToken}`])
      .expect(200);
    expect(removeResponse.body.data.images).toEqual(['https://cloud.test/detail.jpg']);
    expect(deleteFromCloudinary).toHaveBeenCalledWith('places/cover');

    const publicResponse = await request(app).get(`/api/destinations/${destination._id}`).expect(200);
    expect(publicResponse.body.data.images).toEqual(['https://cloud.test/detail.jpg']);
  });

  it('lets a guide upload photos only to their own pending submission', async () => {
    const createResponse = await request(app)
      .post('/api/destinations')
      .set('Cookie', [`token=${guideToken}`])
      .send(destinationData('guide-with-photo'))
      .expect(201);
    uploadToCloudinary.mockResolvedValueOnce({
      public_id: 'places/guide-photo',
      secure_url: 'https://cloud.test/guide-photo.jpg'
    });

    const response = await request(app)
      .post(`/api/destinations/${createResponse.body.data._id}/media`)
      .set('Cookie', [`token=${guideToken}`])
      .attach('images', Buffer.from('photo'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(response.body.data.images).toEqual(['https://cloud.test/guide-photo.jpg']);

    await request(app)
      .post(`/api/destinations/${createResponse.body.data._id}/media`)
      .set('Cookie', [`token=${otherGuideToken}`])
      .attach('images', Buffer.from('photo'), { filename: 'other.jpg', contentType: 'image/jpeg' })
      .expect(403);

    await Destination.findByIdAndUpdate(createResponse.body.data._id, {
      verificationStatus: 'approved',
      published: true
    });

    await request(app)
      .post(`/api/destinations/${createResponse.body.data._id}/media`)
      .set('Cookie', [`token=${guideToken}`])
      .attach('images', Buffer.from('photo'), { filename: 'approved.jpg', contentType: 'image/jpeg' })
      .expect(403);
  });

  it('replaces legacy URL images with managed Cloudinary media', async () => {
    const destination = await Destination.create(destinationData('legacy-gallery', {
      images: ['https://example.test/old.jpg']
    }));
    uploadToCloudinary.mockResolvedValueOnce({
      public_id: 'places/replacement',
      secure_url: 'https://cloud.test/replacement.jpg'
    });

    const response = await request(app)
      .post(`/api/destinations/${destination._id}/media/0/replace`)
      .set('Cookie', [`token=${adminToken}`])
      .attach('image', Buffer.from('replacement'), { filename: 'replacement.webp', contentType: 'image/webp' })
      .expect(200);

    expect(response.body.data.images).toEqual(['https://cloud.test/replacement.jpg']);
    expect(response.body.data.media[0].publicId).toBe('places/replacement');
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it('limits gallery size for admins', async () => {
    const fullDestination = await Destination.create(destinationData('full-gallery', {
      images: Array.from({ length: 10 }, (_value, index) => `https://example.test/${index}.jpg`)
    }));

    const response = await request(app)
      .post(`/api/destinations/${fullDestination._id}/media`)
      .set('Cookie', [`token=${adminToken}`])
      .attach('images', Buffer.from('photo'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(400);

    expect(response.body.message).toMatch(/at most 10 images/);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });
});
