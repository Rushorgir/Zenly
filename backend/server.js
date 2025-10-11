import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import journalRoutes from './routes/journal.route.js';
import aiRoutes from './routes/ai.route.js';
import moodRoutes from './routes/mood.route.js';
import forumRoutes from './routes/forum.route.js';
import resourceRoutes from './routes/resource.route.js';
import adminRoutes from './routes/admin.route.js';
import notificationRoutes from './routes/notification.route.js';
import activityRoutes from './routes/activity.route.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5001;

// Socket.IO configuration
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
});

// Make io accessible to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join forum room for real-time updates
    socket.on('forum:join', () => {
        socket.join('forum');
        console.log(`[Socket.IO] Client ${socket.id} joined forum room`);
    });

    // Leave forum room
    socket.on('forum:leave', () => {
        socket.leave('forum');
        console.log(`[Socket.IO] Client ${socket.id} left forum room`);
    });

    // Join resources room for real-time updates
    socket.on('resources:join', () => {
        socket.join('resources');
        console.log(`[Socket.IO] Client ${socket.id} joined resources room`);
    });

    // Leave resources room
    socket.on('resources:leave', () => {
        socket.leave('resources');
        console.log(`[Socket.IO] Client ${socket.id} left resources room`);
    });

    socket.on('disconnect', (reason) => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (error) => {
        console.error(`[Socket.IO] Socket error for ${socket.id}:`, error);
    });
});

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Welcome route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to the Zenly Mental Health Support Platform API.',
        version: '1.0.0',
        endpoints: {
            auth: '/auth',
            users: '/users/me',
            journals: '/journals',
            ai: '/ai/conversations',
            moods: '/moods',
            forum: '/forum',
            resources: '/resources',
            admin: '/admin',
            notifications: '/notifications'
        }
    });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/users/me', userRoutes);
app.use('/journals', journalRoutes);
// Mount AI routes at /ai so routes like /ai/conversations map correctly
app.use('/ai', aiRoutes);
app.use('/moods', moodRoutes);
app.use('/forum', forumRoutes);
app.use('/resources', resourceRoutes);
app.use('/admin', adminRoutes);
app.use('/notifications', notificationRoutes);
app.use('/activity', activityRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

httpServer.listen(PORT, () => {
    connectDB();
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Socket.IO enabled for real-time updates`);
});