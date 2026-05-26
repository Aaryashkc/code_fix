const User = require('../models/User');
const bcrypt = require('bcryptjs');

const demoUsers = [
  // Admin
  {
    name: 'System Administrator',
    email: 'admin@yatra.com',
    password: 'admin@1',
    role: 'admin',
    verified: true
  },
  // Tourists
  {
    name: 'Sarah Mitchell',
    email: 'sarah@example.com',
    password: 'Tourist@123',
    role: 'tourist',
    country: 'USA',
    phone: '+1-555-0101',
    avatar: 'https://i.pravatar.cc/150?img=1',
    emergencyContact: {
      name: 'John Mitchell',
      phone: '+1-555-0102'
    },
    preferences: {
      categories: ['Adventure', 'Nature'],
      budget: 'Luxury',
      fitness: 'High',
      travelStyle: 'Solo',
      duration: '2 weeks'
    },
    stats: {
      placesVisited: 12,
      pinsCreated: 28,
      upcomingTrips: 1
    },
    verified: true
  },
  {
    name: 'Rahul Kumar',
    email: 'rahul@example.com',
    password: 'Tourist@123',
    role: 'tourist',
    country: 'India',
    phone: '+91-98765-43210',
    avatar: 'https://i.pravatar.cc/150?img=12',
    preferences: {
      categories: ['Religious', 'Cultural'],
      budget: 'Mid-range',
      fitness: 'Medium',
      travelStyle: 'Family',
      duration: '1 week'
    },
    stats: {
      placesVisited: 8,
      pinsCreated: 15,
      upcomingTrips: 0
    },
    verified: true
  },
  {
    name: 'Yuki Tanaka',
    email: 'yuki@example.com',
    password: 'Tourist@123',
    role: 'tourist',
    country: 'Japan',
    phone: '+81-90-1234-5678',
    avatar: 'https://i.pravatar.cc/150?img=5',
    preferences: {
      categories: ['Cultural', 'Nature'],
      budget: 'Mid-range',
      fitness: 'Low',
      travelStyle: 'Group',
      duration: '1 week'
    },
    stats: {
      placesVisited: 5,
      pinsCreated: 10,
      upcomingTrips: 1
    },
    verified: true
  },
  // Guides
  {
    name: 'Pasang Sherpa',
    email: 'pasang@yatra.com',
    password: 'Guide@123',
    role: 'guide',
    avatar: 'https://i.pravatar.cc/150?img=33',
    location: 'Solukhumbu, Nepal',
    phone: '+977-98-12345678',
    memberSince: '2018',
    totalTrips: 150,
    experience: '8 Years',
    successRate: 98,
    responseTime: '<2 hours',
    languages: [
      { code: 'EN', name: 'English' },
      { code: 'NP', name: 'Nepali' },
      { code: 'HI', name: 'Hindi' }
    ],
    specializations: ['High Altitude Trekking', 'Cultural Tours', 'Photography Expeditions'],
    certifications: ['TAAN Licensed Guide', 'Wilderness First Responder', 'Mountain Safety Certified'],
    bio: 'Experienced mountaineer with 8 years guiding across the Himalayas. Specialized in Everest Base Camp, Annapurna Circuit, and Langtang Valley treks. Passionate about sharing Nepal\'s culture and natural beauty.',
    pricePerDay: 3500,
    available: true,
    offerings: ['Customized itineraries', 'Safety equipment provided', 'Cultural insights', 'Photography assistance'],
    licenseNumber: 'TAAN-2018-001234',
    rating: 4.9,
    reviewCount: 128,
    verified: true
  },
  {
    name: 'Mingma Tamang',
    email: 'mingma@yatra.com',
    password: 'Guide@123',
    role: 'guide',
    avatar: 'https://i.pravatar.cc/150?img=11',
    location: 'Kathmandu Valley, Nepal',
    phone: '+977-98-87654321',
    memberSince: '2019',
    totalTrips: 120,
    experience: '6 Years',
    successRate: 97,
    responseTime: '<3 hours',
    languages: [
      { code: 'EN', name: 'English' },
      { code: 'NP', name: 'Nepali' },
      { code: 'JP', name: 'Japanese' }
    ],
    specializations: ['Cultural Tours', 'Religious Sites', 'Family-Friendly Hikes'],
    certifications: ['TAAN Licensed Guide', 'Cultural Heritage Specialist'],
    bio: 'Born and raised in the Kathmandu Valley, I specialize in cultural and heritage tours across Nepal. My deep knowledge of Hindu and Buddhist traditions allows me to offer authentic experiences.',
    pricePerDay: 3000,
    available: true,
    offerings: ['Temple tours', 'Cultural immersion', 'Family packages', 'Heritage walks', 'Local cuisine tours'],
    licenseNumber: 'TAAN-2019-005678',
    rating: 4.8,
    reviewCount: 95,
    verified: true
  },
  {
    name: 'Dawa Lama',
    email: 'dawa@yatra.com',
    password: 'Guide@123',
    role: 'guide',
    avatar: 'https://i.pravatar.cc/150?img=52',
    location: 'Chitwan, Nepal',
    phone: '+977-98-11223344',
    memberSince: '2017',
    totalTrips: 200,
    experience: '10 Years',
    successRate: 99,
    responseTime: '<1 hour',
    languages: [
      { code: 'EN', name: 'English' },
      { code: 'NP', name: 'Nepali' },
      { code: 'DE', name: 'German' }
    ],
    specializations: ['Wildlife Safari', 'Adventure Sports', 'Bird Watching'],
    certifications: ['TAAN Licensed Guide', 'Wildlife Conservation Certified', 'First Aid Certified'],
    bio: 'A wildlife enthusiast with over 10 years of experience in Chitwan National Park. I help travelers experience Nepal\'s incredible biodiversity.',
    pricePerDay: 2800,
    available: false,
    offerings: ['Jungle safaris', 'Bird watching tours', 'Canoe rides', 'Tharu cultural evenings', 'Nature walks'],
    licenseNumber: 'TAAN-2017-009876',
    rating: 4.7,
    reviewCount: 87,
    verified: true
  }
];

async function seedUsers() {
  try {
    let created = 0;
    let skipped = 0;
    
    for (const userData of demoUsers) {
      if (userData.email === 'admin@yatra.com') {
        const passwordHash = await bcrypt.hash(userData.password, 10);
        await User.updateOne(
          { email: userData.email },
          {
            $set: {
              name: userData.name,
              email: userData.email,
              password: passwordHash,
              role: 'admin',
              verified: true,
              phoneVerified: true,
              suspended: false,
              available: true
            }
          },
          { upsert: true, runValidators: false }
        );
        console.log(`✅ Upserted ${userData.email}`);
        created++;
        continue;
      }

      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        console.log(`⚠️  Skipped ${userData.email} - already exists`);
        skipped++;
      } else {
        await User.create(userData);
        console.log(`✅ Created ${userData.email}`);
        created++;
      }
    }
    console.log(`✅ Users seed complete: ${created} created, ${skipped} skipped`);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

module.exports = seedUsers;
