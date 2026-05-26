const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const KEEP_EMAILS = [
  'rahulshakya940756@gmail.com',
  'maskey1559@gmail.com'
];

async function cleanupUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Delete all guide accounts
    const guidesResult = await User.deleteMany({ role: 'guide' });
    console.log(`Deleted ${guidesResult.deletedCount} guide accounts`);

    // 2. Delete all users except the two to keep
    const usersResult = await User.deleteMany({
      email: { $nin: KEEP_EMAILS }
    });
    console.log(`Deleted ${usersResult.deletedCount} other users`);

    // 3. Set remaining users as admin
    const adminResult = await User.updateMany(
      { email: { $in: KEEP_EMAILS } },
      { $set: { role: 'admin' } }
    );
    console.log(`Set ${adminResult.modifiedCount} users as admin`);

    // 4. Show remaining users
    const remaining = await User.find({}, 'email role name');
    console.log('Remaining users:');
    remaining.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));

    console.log('\nCleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupUsers();
