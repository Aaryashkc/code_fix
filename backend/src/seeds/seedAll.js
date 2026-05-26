require('dotenv').config();
const connectDB = require('../config/database');
const seedUsers = require('./users.seed');
const seedDestinations = require('./destinations.seed');

async function seedAll() {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Connect to database
    await connectDB();
    
    // Seed data
    await seedUsers();
    await seedDestinations();
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('Admin: admin@yatra.com / admin@1');
    console.log('Tourist: sarah@example.com / Tourist@123');
    console.log('Guide: pasang@yatra.com / Guide@123');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedAll();
