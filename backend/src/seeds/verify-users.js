const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function verifyUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find({}, 'name email role');
    
    console.log('All users:');
    users.forEach(u => {
      console.log(`  - ${u.name} (${u.email}) - Role: ${u.role}`);
    });

    const admins = users.filter(u => u.role === 'admin');
    console.log(`\nAdmin users (${admins.length}):`);
    admins.forEach(u => console.log(`  ✓ ${u.name} (${u.email})`));

    if (admins.length === 0) {
      console.log('\n⚠️ WARNING: No admin users found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyUsers();
