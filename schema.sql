-- Zenly Supabase Postgres Schema (Migration from MongoDB)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR UNIQUE NOT NULL,
    "passwordHash" VARCHAR,
    name VARCHAR NOT NULL,
    "firstName" VARCHAR,
    "lastName" VARCHAR,
    university VARCHAR,
    "academicYear" VARCHAR,
    role VARCHAR DEFAULT 'user',
    "avatarUrl" VARCHAR,
    "emailVerified" BOOLEAN DEFAULT false,
    "emailVerifiedAt" TIMESTAMPTZ,
    "verificationOTP" VARCHAR,
    "otpExpiry" TIMESTAMPTZ,
    "otpAttempts" INTEGER DEFAULT 0,
    "lastOTPSentAt" TIMESTAMPTZ,
    "isAnonymous" BOOLEAN DEFAULT false,
    "lastActive" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    preferences JSONB DEFAULT '{"notifications":true,"emailUpdates":true,"publicProfile":false}',
    "counselorDetails" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mood INTEGER,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR DEFAULT 'draft',
    "aiAnalysis" JSONB,
    "reflectionMessages" JSONB DEFAULT '[]',
    visibility VARCHAR DEFAULT 'private',
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AI Conversations
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    "journalEntryId" UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    title VARCHAR,
    type VARCHAR DEFAULT 'general-chat',
    status VARCHAR DEFAULT 'active',
    summary TEXT,
    context JSONB DEFAULT '{"recentJournals": [], "userPreferences": {}, "conversationGoals": [], "topicsDiscussed": []}',
    "crisisDetected" BOOLEAN DEFAULT false,
    "crisisLevel" VARCHAR,
    "messageCount" INTEGER DEFAULT 0,
    "lastMessageAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AI Messages
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "conversationId" UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT,
    metadata JSONB,
    feedback JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR NOT NULL,
    meta JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Forum Posts
CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    content TEXT NOT NULL,
    "isAnonymous" BOOLEAN DEFAULT false,
    category VARCHAR,
    "isPinned" BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    reports JSONB DEFAULT '[]',
    "isFlagged" BOOLEAN DEFAULT false,
    "deletedAt" TIMESTAMPTZ,
    views INTEGER DEFAULT 0,
    "likesCount" INTEGER DEFAULT 0,
    "commentsCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Forum Comments
CREATE TABLE forum_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "postId" UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    "parentCommentId" UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    "isAnonymous" BOOLEAN DEFAULT false,
    depth INTEGER DEFAULT 0,
    "likesCount" INTEGER DEFAULT 0,
    "isDeleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Forum Reactions
CREATE TABLE forum_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "postId" UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    "commentId" UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR DEFAULT 'like',
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("postId", "userId"),
    UNIQUE ("commentId", "userId")
);

-- Metrics Daily
CREATE TABLE metrics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    dau INTEGER,
    sessions INTEGER,
    "journalCount" INTEGER,
    distribution JSONB
);

-- Mood Logs
CREATE TABLE mood_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mood INTEGER,
    notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", date)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR,
    payload JSONB,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    url VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    categories TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    language VARCHAR DEFAULT 'English',
    duration VARCHAR,
    author VARCHAR,
    "thumbnailUrl" VARCHAR,
    "embedData" JSONB,
    "isFeatured" BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    "viewCount" INTEGER DEFAULT 0,
    "helpfulCount" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
