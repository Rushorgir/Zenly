import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
const ForumPostSchema = new mongoose.Schema({}, { collection: 'forumposts', strict: false });
const ForumCommentSchema = new mongoose.Schema({}, { collection: 'forumcomments', strict: false });
const ForumReactionSchema = new mongoose.Schema({}, { collection: 'forumreactions', strict: false });

const ForumPost = mongoose.model('ForumPost', ForumPostSchema);
const ForumComment = mongoose.model('ForumComment', ForumCommentSchema);
const ForumReaction = mongoose.model('ForumReaction', ForumReactionSchema);

async function clearAllPosts() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenly';
    console.log('Connecting to MongoDB:', mongoURI);
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Count documents before deletion
    const postsCount = await ForumPost.countDocuments();
    const commentsCount = await ForumComment.countDocuments();
    const reactionsCount = await ForumReaction.countDocuments();

    console.log('\n📊 Current counts:');
    console.log(`  - Posts: ${postsCount}`);
    console.log(`  - Comments: ${commentsCount}`);
    console.log(`  - Reactions: ${reactionsCount}`);

    if (postsCount === 0 && commentsCount === 0 && reactionsCount === 0) {
      console.log('\n✨ Database is already clean!');
      await mongoose.connection.close();
      return;
    }

    // Delete all forum-related data
    console.log('\n🗑️  Deleting all forum data...');
    
    const postResult = await ForumPost.deleteMany({});
    console.log(`  ✓ Deleted ${postResult.deletedCount} posts`);
    
    const commentResult = await ForumComment.deleteMany({});
    console.log(`  ✓ Deleted ${commentResult.deletedCount} comments`);
    
    const reactionResult = await ForumReaction.deleteMany({});
    console.log(`  ✓ Deleted ${reactionResult.deletedCount} reactions`);

    console.log('\n✅ All forum data cleared successfully!');

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error clearing posts:', error);
    process.exit(1);
  }
}

// Run the function
clearAllPosts();
