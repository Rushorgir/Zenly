import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.warn('⚠️  MONGO_URI not set. Running without database connection.');
            console.warn('   Some features will not work. Set MONGO_URI in backend/.env');
            return null;
        }
        
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        console.warn('⚠️  Continuing without database. Some features will not work.');
        return null;
    }
}