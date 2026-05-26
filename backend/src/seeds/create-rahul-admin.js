const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function createMissingAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'rahulshakya940756@gmail.com';
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create the admin user
      user = await User.create({
        name: 'Rahul Shakya',
        email: email,
        password: 'admin123', // Default password - should be changed
        role: 'admin',
        phone: '+9779800000000',
        verified: true,
        phoneVerified: true
      });
      console.log(`Created admin user: ${email}`);
    } else {
      // Ensure user is admin
      user.role = 'admin';
      await user.save();
      console.log(`Updated existing user to admin: ${email}`);
    }

    // Show all admin users
    const admins = await User.find({ role: 'admin' }, 'email name role');
    console.log('\nAdmin users:');
    admins.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));

    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createMissingAdmin();
