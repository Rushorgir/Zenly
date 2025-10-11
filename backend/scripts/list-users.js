/**
 * List Users Script
 * Shows all users with their roles
 * 
 * Usage:
 * node scripts/list-users.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

dotenv.config();

const listUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zenly');
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({})
      .select('email name role createdAt')
      .sort({ createdAt: -1 });

    if (users.length === 0) {
      console.log('No users found in database.\n');
      process.exit(0);
    }

    console.log(`Found ${users.length} user(s):\n`);
    console.log('─'.repeat(80));

    users.forEach((user, index) => {
      const roleEmoji = user.role === 'admin' ? '👑' : user.role === 'moderator' ? '🛡️' : '👤';
      console.log(`${index + 1}. ${roleEmoji} ${user.name || 'No name'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      console.log('─'.repeat(80));
    });

    console.log('\nRoles:');
    console.log('  👑 admin     - Full access to admin panel');
    console.log('  🛡️ moderator - Can moderate content');
    console.log('  👤 user      - Regular user\n');

    // Count by role
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    console.log('Summary:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

listUsers();
