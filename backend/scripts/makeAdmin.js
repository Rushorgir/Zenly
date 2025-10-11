import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({}, { collection: 'users', strict: false });
const User = mongoose.model('User', UserSchema);

async function makeAdmin() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenly';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Get email from command line or use default
    const email = process.argv[2] || 'student@example.com';
    
    // Find and update user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User with email "${email}" not found`);
      console.log('\n💡 Usage: node makeAdmin.js <email>');
      console.log('   Example: node makeAdmin.js student@example.com\n');
      await mongoose.connection.close();
      return;
    }

    console.log(`📧 Found user: ${email}`);
    console.log(`👤 Name: ${user.name || user.firstName + ' ' + user.lastName}`);
    console.log(`🔑 Current role: ${user.role || 'user'}\n`);

    // Update to admin
    await User.updateOne(
      { email },
      { $set: { role: 'admin' } }
    );

    console.log('✅ User updated to admin successfully!\n');
    console.log('🎉 You can now access admin features:');
    console.log('   - /admin dashboard');
    console.log('   - All Posts tab');
    console.log('   - Reported Posts management');
    console.log('   - Delete any post\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

makeAdmin();
