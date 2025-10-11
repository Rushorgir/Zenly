import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['video', 'audio', 'article'],
    required: true
  },
  categories: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  language: {
    type: String,
    default: 'English'
  },
  duration: String,
  author: String,
  thumbnailUrl: String,
  embedData: {
    platform: String,
    embedId: String,
    thumbnailUrl: String
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
resourceSchema.index({ title: 1 }); // For title search
resourceSchema.index({ tags: 1 }); // For tag search
resourceSchema.index({ type: 1, isFeatured: 1, priority: -1 });
resourceSchema.index({ createdAt: -1 });

resourceSchema.methods.extractEmbedData = function() {
  const url = this.url;
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    this.embedData = { platform: 'youtube', embedId: youtubeMatch[1] };
    return;
  }
  const spotifyRegex = /spotify\.com\/(episode|show|track)\/([a-zA-Z0-9]+)/;
  const spotifyMatch = url.match(spotifyRegex);
  if (spotifyMatch) {
    this.embedData = { platform: 'spotify', embedId: spotifyMatch[2] };
    return;
  }
  // For web articles, use thumbnailUrl from top-level field
  this.embedData = { platform: 'web' };
  if (this.thumbnailUrl) {
    this.embedData.thumbnailUrl = this.thumbnailUrl;
  }
};

resourceSchema.pre('save', function(next) {
  if (this.isModified('url') && !this.embedData?.embedId) {
    this.extractEmbedData();
  }
  next();
});

export const Resource = mongoose.model('Resource', resourceSchema);
