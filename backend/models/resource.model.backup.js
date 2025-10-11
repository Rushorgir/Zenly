import mongoose from 'mongoose'

const ResourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    summary: String,
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['video', 'audio', 'article'],
      required: true,
    },
    category: {
      type: [String],
      default: [],
      index: true,
    },
    language: { type: String, default: 'English' },
    duration: String, // e.g., "12 min", "20 min read"

    // Embed data for different platforms
    embedData: {
      youtubeId: String, // For YouTube videos (extracted from URL)
      spotifyId: String, // For Spotify podcasts (extracted from URL)
      thumbnailUrl: String, // For articles/custom thumbnails
      author: String, // Content creator/author
      platform: String, // YouTube, Spotify, Medium, etc.
    },

    // Featured & Priority
    isFeatured: { type: Boolean, default: false, index: true },
    priority: { type: Number, default: 0 }, // Higher = shows first in featured

    // Metadata
    tags: [{ type: String, lowercase: true, trim: true }],
    downloadable: { type: Boolean, default: false },

    // Engagement
    viewCount: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },

    // Admin
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

// Indexes for search and filtering
ResourceSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  { default_language: 'none' }
)
ResourceSchema.index({ type: 1, isFeatured: 1, priority: -1 })
ResourceSchema.index({ isActive: 1, createdAt: -1 })

// Helper method to extract embed IDs from URLs
ResourceSchema.methods.extractEmbedData = function () {
  const url = this.url

  // YouTube video ID extraction
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const youtubeMatch = url.match(youtubeRegex)
  if (youtubeMatch) {
    this.embedData.youtubeId = youtubeMatch[1]
    this.embedData.platform = 'YouTube'
  }

  // Spotify embed ID extraction
  const spotifyRegex = /spotify\.com\/(episode|show|track)\/([a-zA-Z0-9]+)/
  const spotifyMatch = url.match(spotifyRegex)
  if (spotifyMatch) {
    this.embedData.spotifyId = spotifyMatch[2]
    this.embedData.platform = 'Spotify'
  }
}

// Auto-extract embed data before saving
ResourceSchema.pre('save', function (next) {
  if (this.isModified('url')) {
    this.extractEmbedData()
  }
  next()
})

export const Resource = mongoose.model('Resource', ResourceSchema)
export default Resource
