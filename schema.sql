-- Zenly Supabase Postgres Schema (Migration from MongoDB)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: ai_conversations
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    "journalEntryId" UUID, -- references journal_entries(id) 
    title TEXT,
    type TEXT DEFAULT 'general-chat',
    status TEXT DEFAULT 'active',
    context JSONB DEFAULT '{}'::jsonb,
    "messageCount" INTEGER DEFAULT 0,
    "lastMessageAt" TIMESTAMP WITH TIME ZONE,
    "crisisDetected" BOOLEAN DEFAULT FALSE,
    "crisisLevel" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_ai_conversations_userid ON ai_conversations("userId");

-- Table: ai_messages
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "conversationId" UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    feedback JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_ai_messages_convid ON ai_messages("conversationId");

-- Table: forum_posts
CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    "isAnonymous" BOOLEAN DEFAULT FALSE,
    "isPinned" BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    "likesCount" INTEGER DEFAULT 0,
    "commentsCount" INTEGER DEFAULT 0,
    "isModerated" BOOLEAN DEFAULT FALSE,
    "isFlagged" BOOLEAN DEFAULT FALSE,
    "reportCount" INTEGER DEFAULT 0,
    reports JSONB DEFAULT '[]'::jsonb,
    "deletedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_forum_posts_created ON forum_posts("createdAt" DESC);
CREATE INDEX idx_forum_posts_category ON forum_posts(category);

-- Table: forum_comments
CREATE TABLE forum_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "postId" UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    "parentCommentId" UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    depth INTEGER DEFAULT 0,
    "repliesCount" INTEGER DEFAULT 0,
    "isAnonymous" BOOLEAN DEFAULT FALSE,
    "likesCount" INTEGER DEFAULT 0,
    "isModerated" BOOLEAN DEFAULT FALSE,
    "isFlagged" BOOLEAN DEFAULT FALSE,
    "reportCount" INTEGER DEFAULT 0,
    reports JSONB DEFAULT '[]'::jsonb,
    "deletedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_forum_comments_postid ON forum_comments("postId");

-- Table: forum_reactions
CREATE TABLE forum_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    "postId" UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    "commentId" UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'like',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_forum_reactions_post_user ON forum_reactions("postId", "userId") WHERE "postId" IS NOT NULL;
CREATE UNIQUE INDEX idx_forum_reactions_comment_user ON forum_reactions("commentId", "userId") WHERE "commentId" IS NOT NULL;

-- Table: mood_logs
CREATE TABLE mood_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    mood INTEGER,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("userId", date)
);

-- Table: notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    "readAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_notifications_userid ON notifications("userId");

-- Table: resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('video', 'audio', 'article')),
    categories TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    language TEXT DEFAULT 'English',
    duration TEXT,
    author TEXT,
    "thumbnailUrl" TEXT,
    "embedData" JSONB DEFAULT '{}'::jsonb,
    "isFeatured" BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    "viewCount" INTEGER DEFAULT 0,
    "helpfulCount" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_resources_title ON resources(title);

-- Table: metrics_daily
CREATE TABLE metrics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMP WITH TIME ZONE UNIQUE NOT NULL,
    dau INTEGER,
    sessions INTEGER,
    "journalCount" INTEGER,
    distribution JSONB DEFAULT '{}'::jsonb
);
