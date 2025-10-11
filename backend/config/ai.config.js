/**
 * AI Configuration and Constants
 */

export default {
  // Model Configuration
  MODEL: {
    NAME: process.env.HUGGINGFACE_MODEL || 'zai-org/GLM-4.6',
    TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
    MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS) || 500,
    TIMEOUT: parseInt(process.env.AI_TIMEOUT_MS) || 30000,
  },

  // Rate Limiting
  RATE_LIMIT: {
    PER_USER: parseInt(process.env.AI_RATE_LIMIT_PER_USER) || 20,
    WINDOW_MINUTES: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MINUTES) || 60,
    DAILY_LIMIT: 100, // Max AI requests per user per day
  },

  // Crisis Detection
  CRISIS: {
    KEYWORDS: [
      // Suicide-related
      'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
      'better off dead', 'no reason to live', 'take my life',
      
      // Self-harm
      'self harm', 'self-harm', 'cut myself', 'hurt myself', 'harm myself',
      
      // Extreme distress
      'can\'t go on', 'give up', 'no hope', 'hopeless', 'worthless',
      'everyone would be better without me',
      
      // Violence
      'hurt others', 'hurt someone', 'kill someone', 'harm others',
    ],
    
    RISK_LEVELS: {
      HIGH: ['suicide', 'suicidal', 'kill myself', 'end my life', 'self harm', 'cut myself'],
      MEDIUM: ['depressed', 'hopeless', 'worthless', 'can\'t go on', 'give up'],
      LOW: ['stressed', 'anxious', 'worried', 'overwhelmed', 'sad'],
    },

    HOTLINES: {
      NATIONAL: process.env.NATIONAL_CRISIS_HOTLINE || '988',
      CAMPUS: process.env.CAMPUS_HOTLINE || 'Contact your campus counseling center',
    },
  },

  // Sentiment Analysis
  SENTIMENT: {
    POSITIVE_INDICATORS: ['happy', 'joy', 'excited', 'grateful', 'proud', 'accomplished', 'love', 'content'],
    NEGATIVE_INDICATORS: ['sad', 'angry', 'frustrated', 'depressed', 'anxious', 'worried', 'stressed', 'overwhelmed'],
    NEUTRAL_INDICATORS: ['okay', 'fine', 'normal', 'average', 'alright'],
  },

  // Context Management
  CONTEXT: {
    MAX_MESSAGES_IN_CONTEXT: 10, // Last N messages to include
    MAX_JOURNAL_ENTRIES: 3, // Last N journal entries to include
    MAX_CONTEXT_TOKENS: 2000, // Maximum tokens for context
  },

  // Response Quality
  RESPONSE: {
    MIN_LENGTH: 20, // Minimum characters in response
    MAX_LENGTH: 1000, // Maximum characters in response
    REQUIRE_EMPATHY_KEYWORDS: ['understand', 'hear', 'feel', 'support', 'here for you'],
  },

  // Safety Filters
  SAFETY: {
    FORBIDDEN_TOPICS: [
      'medication dosage',
      'prescription',
      'medical diagnosis',
      'illegal activities',
      'self-medication',
    ],
    
    REQUIRED_DISCLAIMERS: {
      CRISIS: '🆘 This is a crisis situation. Please reach out immediately to: National Crisis Hotline: ${HOTLINE}',
      MEDICAL: '⚕️ I\'m not a medical professional. Please consult with a healthcare provider for medical advice.',
      THERAPY: '💙 I\'m here to support you, but I can\'t replace professional therapy. Consider speaking with a counselor.',
    },
  },

  // Caching
  CACHE: {
    ENABLED: true,
    TTL_SECONDS: 3600, // 1 hour
    MAX_CACHE_SIZE: 1000, // Maximum cached responses
  },

  // Monitoring
  MONITORING: {
    LOG_ALL_REQUESTS: true,
    LOG_CRISIS_EVENTS: true,
    ALERT_ADMIN_ON_CRISIS: true,
    TRACK_TOKEN_USAGE: true,
  },

  // Fallback
  FALLBACK: {
    ENABLED: true,
    RESPONSES: [
  "",
      "That sounds really challenging. How are you feeling about this?",
      "I understand this is difficult. What kind of support would be most helpful right now?",
      "Thank you for sharing that with me. What's been on your mind lately?",
    ],
  },
};
