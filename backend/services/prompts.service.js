/**
 * Prompt Engineering Service for Mental Health AI
 * Specialized prompts for GLM-4.6
 */

import AI_CONFIG from '../config/ai.config.js';

class PromptsService {
  /**
   * Get system prompt for mental health chat
   * @returns {string}
   */
  getSystemPrompt() {
    return `You are a compassionate mental health support companion for university students. Your role is to:

1. Listen actively and validate feelings without judgment
2. Provide evidence-based coping strategies and emotional support
3. Help students navigate academic stress, relationships, and personal challenges
4. Detect crisis situations and provide appropriate resources
5. Encourage professional help when needed

IMPORTANT GUIDELINES:
- You are NOT a therapist, psychiatrist, or medical professional
- NEVER diagnose mental health conditions
- NEVER prescribe or recommend specific medications
- NEVER tell someone to stop taking prescribed medications
- ALWAYS encourage professional help for serious concerns
- In crisis situations, immediately provide hotline numbers
- Be warm, empathetic, and non-judgmental
- Keep responses conversational (2-4 sentences typical)
- Ask follow-up questions to understand better
- Provide actionable suggestions when appropriate

RESPONSE STYLE:
- Start with empathetic acknowledgment
- Validate their feelings
- Offer 1-2 concrete coping strategies
- Ask if they'd like to explore more
- Keep tone supportive but professional

Remember: Your goal is to support, not to solve. Guide students to resources and help them feel heard.`;
  }

  /**
   * Build chat prompt with context
   * @param {string} userMessage - Current user message
   * @param {Array} conversationHistory - Previous messages
   * @param {Array} journalContext - Relevant journal entries
   * @returns {string}
   */
  buildChatPrompt(userMessage, conversationHistory = [], journalContext = []) {
    let prompt = this.getSystemPrompt() + '\n\n';

    // Add journal context if available
    if (journalContext && journalContext.length > 0) {
      prompt += 'STUDENT BACKGROUND (from recent journal entries):\n';
      journalContext.slice(-3).forEach(entry => {
        const date = new Date(entry.createdAt).toLocaleDateString();
        prompt += `- ${date}: ${entry.content?.substring(0, 200)}...\n`;
        if (entry.aiSummary) {
          prompt += `  Summary: ${entry.aiSummary}\n`;
        }
      });
      prompt += '\n';
    }

    // Add conversation history (last 5 messages)
    if (conversationHistory && conversationHistory.length > 0) {
      prompt += 'CONVERSATION HISTORY:\n';
      const recentMessages = conversationHistory.slice(-10);
      recentMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'Student' : 'Assistant';
        prompt += `${role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    // Add current message
    prompt += `Student: ${userMessage}\n`;
    prompt += 'Assistant:';

    return prompt;
  }

  /**
   * Build journal analysis prompt
   * @param {string} journalContent - Journal entry content
   * @param {object} userData - User context (mood, tags, etc.)
   * @returns {string}
   */
  buildJournalAnalysisPrompt(journalContent, userData = {}) {
    return `You are a mental health AI analyzing a student's journal entry. Provide a therapeutic analysis.

JOURNAL ENTRY:
"${journalContent}"

STUDENT CONTEXT:
- Mood: ${userData.mood || 'Not specified'}
- Tags: ${userData.tags?.join(', ') || 'None'}

TASK: Analyze this entry and provide:
1. A brief summary (1-2 sentences)
2. Key emotional insights and patterns
3. Suggested coping strategies or reflections (2-3 actionable items)

Be empathetic, supportive, and focus on strengths as well as challenges.

Format your response as JSON:
{
  "summary": "Brief summary here",
  "insights": "Therapeutic insights here",
  "copingStrategies": [
    "Strategy 1",
    "Strategy 2",
    "Strategy 3"
  ]
}`;
  }

  /**
   * Build sentiment analysis prompt
   * @param {string} text - Text to analyze
   * @returns {string}
   */
  buildSentimentPrompt(text) {
    return `Analyze the emotional tone of this text and classify it.

TEXT: "${text}"

Respond with ONLY ONE WORD:
- "positive" if the overall tone is positive, hopeful, or upbeat
- "negative" if the overall tone is sad, anxious, angry, or distressed
- "neutral" if the tone is balanced, factual, or neither positive nor negative

RESPONSE:`;
  }

  /**
   * Build risk assessment prompt
   * @param {string} text - Text to assess
   * @returns {string}
   */
  buildRiskAssessmentPrompt(text) {
    return `You are a crisis detection AI. Assess the mental health risk level in this text.

TEXT: "${text}"

RISK LEVELS:
- "high" = Immediate danger, mentions of suicide, self-harm, or harming others
- "medium" = Significant distress, hopelessness, but no immediate danger
- "low" = Normal stress, anxiety, or sadness without crisis indicators

Consider:
1. Explicit mentions of self-harm or suicide
2. Expressions of hopelessness or worthlessness
3. Social withdrawal or isolation
4. Sudden changes in behavior or mood
5. Loss of interest in activities

Respond with ONLY ONE WORD: high, medium, or low

RISK LEVEL:`;
  }

  /**
   * Build crisis response prompt
   * @param {string} userMessage - Message indicating crisis
   * @param {string} riskLevel - high, medium, low
   * @returns {string}
   */
  buildCrisisResponsePrompt(userMessage, riskLevel = 'high') {
    const hotline = AI_CONFIG.CRISIS.HOTLINES.NATIONAL;
    
    return `CRISIS SITUATION DETECTED - ${riskLevel.toUpperCase()} RISK

Student message: "${userMessage}"

You must respond with URGENT care and provide crisis resources.

Your response should:
1. Acknowledge their pain with deep empathy
2. Validate that reaching out took courage
3. Provide the crisis hotline: ${hotline}
4. Encourage immediate professional help
5. Express that their life has value
6. Keep it brief but caring (3-4 sentences)

Example tone: "I hear how much pain you're in right now, and I'm really concerned about you. Please reach out to the National Crisis Hotline at ${hotline} - they have trained counselors available 24/7. Your life has value, and you deserve support. Will you call them now?"

Your response:`;
  }

  /**
   * Build therapeutic response prompt for common issues
   * @param {string} issue - Type of issue (anxiety, depression, stress, etc.)
   * @param {string} userMessage - User's message
   * @returns {string}
   */
  buildTherapeuticPrompt(issue, userMessage) {
    const strategies = {
      anxiety: [
        '4-7-8 breathing (inhale 4, hold 7, exhale 8)',
        'Grounding technique (5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste)',
        'Progressive muscle relaxation',
        'Mindful walking or movement'
      ],
      stress: [
        'Break tasks into smaller, manageable chunks (Pomodoro: 25 min work, 5 min break)',
        'Prioritize with Eisenhower Matrix (urgent/important)',
        'Set boundaries and say "no" to non-essentials',
        'Schedule short breaks for self-care'
      ],
      depression: [
        'Behavioral activation: one small activity you used to enjoy',
        'Reach out to one trusted friend or family member',
        'Gentle movement: 10-minute walk outside',
        'Self-compassion: talk to yourself like a good friend'
      ],
      loneliness: [
        'Join one campus club or study group',
        'Reach out to one person with a simple "How are you?"',
        'Attend one campus event this week',
        'Consider peer support groups or counseling'
      ],
      sleep: [
        'Keep consistent sleep/wake times (even weekends)',
        'Wind-down routine: 30 min before bed, dim lights, no screens',
        'Create a sleep-friendly environment: cool, dark, quiet',
        'Avoid caffeine after 2pm'
      ]
    };

    const relevantStrategies = strategies[issue] || strategies.stress;

    return `${this.getSystemPrompt()}

The student is experiencing ${issue}. They said: "${userMessage}"

Provide a supportive response that:
1. Validates their feelings about ${issue}
2. Normalizes the experience (many students face this)
3. Offers 2 evidence-based coping strategies from: ${relevantStrategies.join(', ')}
4. Asks if they'd like to explore any strategy further
5. Keeps tone warm and encouraging (3-4 sentences)

Your response:`;
  }

  /**
   * Detect topic from message and get appropriate prompt
   * @param {string} message - User message
   * @returns {object} - { topic, issue, isCrisis }
   */
  detectTopic(message) {
    const lowerMsg = message.toLowerCase();
    
    // Crisis detection
    const crisisKeywords = AI_CONFIG.CRISIS.KEYWORDS;
    const highRiskKeywords = AI_CONFIG.CRISIS.RISK_LEVELS.HIGH;
    
    for (const keyword of highRiskKeywords) {
      if (lowerMsg.includes(keyword.toLowerCase())) {
        return { topic: 'crisis', issue: 'crisis', isCrisis: true, riskLevel: 'high' };
      }
    }

    for (const keyword of crisisKeywords) {
      if (lowerMsg.includes(keyword.toLowerCase())) {
        return { topic: 'crisis', issue: 'crisis', isCrisis: true, riskLevel: 'medium' };
      }
    }

    // Topic detection
    if (lowerMsg.match(/\b(anxious|anxiety|worried|panic|nervous)\b/)) {
      return { topic: 'anxiety', issue: 'anxiety', isCrisis: false };
    }
    if (lowerMsg.match(/\b(depressed|depression|sad|down|empty|numb)\b/)) {
      return { topic: 'depression', issue: 'depression', isCrisis: false };
    }
    if (lowerMsg.match(/\b(stress|stressed|overwhelm|pressure|too much)\b/)) {
      return { topic: 'stress', issue: 'stress', isCrisis: false };
    }
    if (lowerMsg.match(/\b(lonely|alone|isolated|no friends|left out)\b/)) {
      return { topic: 'loneliness', issue: 'loneliness', isCrisis: false };
    }
    if (lowerMsg.match(/\b(sleep|insomnia|tired|exhausted|can't sleep)\b/)) {
      return { topic: 'sleep', issue: 'sleep', isCrisis: false };
    }

    return { topic: 'general', issue: null, isCrisis: false };
  }
}

export default new PromptsService();
