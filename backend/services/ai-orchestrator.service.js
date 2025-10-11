/**
 * AI Orchestrator Service
 * 
 * Central coordinator for all AI operations including:
 * - Journal analysis workflow
 * - Chat response generation
 * - Crisis detection orchestration
 * - Context management
 * - Caching and performance optimization
 */

import huggingfaceService from './huggingface.service.js';
import promptsService from './prompts.service.js';
import crisisDetectionService from './crisis-detection.service.js';
import contextBuilderService from './context-builder.service.js';
import JournalEntry from '../models/journalEntry.model.js';
import AIConversation from '../models/aiConversation.model.js';

class AIOrchestrator {
  constructor() {
    this.cache = new Map(); // In-memory cache (move to Redis in production)
    this.CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Analyze journal entry with parallel execution
   * @param {string} journalId - Journal entry ID
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeJournal(journalId) {
    try {
      console.log(`[AI Orchestrator] Starting journal analysis: ${journalId}`);
      
      // Get journal entry
      const journal = await JournalEntry.findById(journalId);
      if (!journal) {
        throw new Error('Journal not found');
      }

      // Build user context
      const context = await contextBuilderService.buildContext(journal.userId, {
        includeJournals: true,
        includeConversations: false,
        maxJournals: 3,
        timeRange: '30d'
      });

      // Execute all analysis tasks in parallel for speed
      const [sentimentResult, insightsResult, summaryResult, riskResult] = await Promise.allSettled([
        this.analyzeSentiment(journal.content, context),
        this.generateInsights(journal.content, context),
        this.generateSummary(journal.content),
        this.assessRisk(journal.content, journal.userId) // Pass userId, not context
      ]);

      // Extract results with fallbacks
      const analysis = {
        sentiment: sentimentResult.status === 'fulfilled' 
          ? sentimentResult.value 
          : this.getFallbackSentiment(journal.content),
        
        insights: insightsResult.status === 'fulfilled'
          ? insightsResult.value
          : ['Unable to generate insights at this time'],
        
        summary: summaryResult.status === 'fulfilled'
          ? summaryResult.value
          : journal.content.substring(0, 100) + '...',
        
        risk: riskResult.status === 'fulfilled'
          ? riskResult.value
          : { level: 'low', factors: [], confidence: 0 }
      };

      // Generate suggested actions based on analysis
      analysis.suggestedActions = this.generateSuggestedActions(analysis);

      console.log(`[AI Orchestrator] Journal analysis complete: ${journalId}`, {
        sentimentScore: analysis.sentiment.score,
        riskLevel: analysis.risk.level,
        insightsCount: analysis.insights.length
      });

      return analysis;

    } catch (error) {
      console.error(`[AI Orchestrator] Journal analysis error: ${journalId}`, error);
      throw error;
    }
  }

  /**
   * Analyze sentiment with AI
   */
  async analyzeSentiment(content, context) {
    const prompt = `Analyze the emotional sentiment of this journal entry. Consider the user's context and history.

User Context:
${context.patterns?.moodTrend ? `Recent mood trend: ${context.patterns.moodTrend}` : ''}
${context.patterns?.commonThemes?.length ? `Common themes: ${context.patterns.commonThemes.join(', ')}` : ''}

Journal Entry:
"${content}"

Provide sentiment analysis in JSON format:
{
  "score": <number from -1 (very negative) to 1 (very positive)>,
  "label": "<positive|neutral|negative>",
  "confidence": <number from 0 to 1>,
  "primaryEmotions": ["emotion1", "emotion2"],
  "reasoning": "<brief explanation>"
}`;

    try {
      const response = await huggingfaceService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 200
      });

      const parsed = this.parseJSONResponse(response);
      
      return {
        score: parsed.score || 0,
        label: parsed.label || 'neutral',
        confidence: parsed.confidence || 0.5,
        primaryEmotions: parsed.primaryEmotions || [],
        reasoning: parsed.reasoning || ''
      };

    } catch (error) {
      console.error('[AI Orchestrator] Sentiment analysis error:', error);
      return this.getFallbackSentiment(content);
    }
  }

  /**
   * Generate insights from journal
   */
  async generateInsights(content, context) {
    const prompt = promptsService.buildJournalAnalysisPrompt(content, context);

    try {
      const response = await huggingfaceService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 300
      });

      const parsed = this.parseJSONResponse(response);
      
      return parsed.insights || [
        'Reflection on emotional state',
        'Consider reaching out to support'
      ];

    } catch (error) {
      console.error('[AI Orchestrator] Insights generation error:', error);
      return ['Unable to generate insights at this time'];
    }
  }

  /**
   * Generate summary
   */
  async generateSummary(content) {
    const prompt = `Summarize this journal entry in 1-2 concise sentences:

"${content}"

Summary:`;

    try {
      const response = await huggingfaceService.generateText(prompt, {
        temperature: 0.5,
        maxTokens: 100
      });

      return response.trim();

    } catch (error) {
      console.error('[AI Orchestrator] Summary generation error:', error);
      return content.substring(0, 100) + '...';
    }
  }

  /**
   * Assess risk level
   */
  async assessRisk(content, userId) {
    try {
      const crisisResult = await crisisDetectionService.detectCrisis(content, userId);
      
      return {
        level: crisisResult.riskLevel,
        factors: crisisResult.indicators || [],
        confidence: crisisResult.confidence || 0.5,
        isCrisis: crisisResult.isCrisis
      };

    } catch (error) {
      console.error('[AI Orchestrator] Risk assessment error:', error);
      return { level: 'low', factors: [], confidence: 0, isCrisis: false };
    }
  }

  /**
   * Generate chat response with full context
   * @param {string} conversationId - Conversation ID
   * @param {string} userMessage - User's message
   * @returns {Promise<Object>} AI response with metadata
   */
  async generateChatResponse(conversationId, userMessage) {
    try {
      console.log(`[AI Orchestrator] Generating chat response for: ${conversationId}`);

      // Get conversation
      const conversation = await AIConversation.findById(conversationId)
        .populate('journalEntryId');

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Build conversation context
      const context = await contextBuilderService.buildConversationContext(conversation);

      // PRIORITY 1: Crisis detection (pass userId, not context)
      const crisisCheck = await crisisDetectionService.detectCrisis(userMessage, conversation.userId);
      
      let responseText;
      let metadata = {
        isCrisis: crisisCheck.isCrisis,
        riskLevel: crisisCheck.riskLevel,
        model: process.env.HUGGINGFACE_MODEL || 'zai-org/GLM-4.6'
      };

      // If crisis detected, use crisis response
      if (crisisCheck.isCrisis) {
        console.log(`[AI Orchestrator] Crisis detected in conversation ${conversationId}`);
        
        responseText = await crisisDetectionService.generateCrisisResponse(
          userMessage,
          crisisCheck
        );

        metadata.crisisResources = crisisCheck.resources;
        metadata.crisisHandled = true;

        // Update conversation status
        await AIConversation.findByIdAndUpdate(conversationId, {
          status: 'crisis',
          crisisDetected: true,
          crisisLevel: crisisCheck.riskLevel,
          crisisTimestamp: new Date()
        });

        // Alert admins if high risk
        if (crisisCheck.riskLevel === 'high') {
          await crisisDetectionService.alertAdmins(
            conversation.userId,
            userMessage,
            crisisCheck
          );
        }

      } else {
        // Normal response with context
        const promptType = conversation.type === 'journal-reflection' 
          ? 'reflective' 
          : 'supportive';

        // Ensure we pass conversation history and journal context arrays
        const conversationHistory = context.conversation?.messages || [];
        // currentJournal (if present) is a single object; normalize to array
        const journalContext = context.currentJournal ? [context.currentJournal] : (context.recentJournals || []);

        const prompt = promptsService.buildChatPrompt(
          userMessage,
          conversationHistory,
          journalContext
        );

        responseText = await huggingfaceService.generateText(prompt, {
          temperature: 0.8,
          maxTokens: 400
        });

        metadata.hasJournalContext = !!conversation.journalEntryId;
        metadata.contextType = promptType;
      }

      // Validate response quality
      const isValid = this.validateResponse(responseText);
      if (!isValid) {
        console.warn('[AI Orchestrator] Response failed validation, using fallback');
        responseText = this.getFallbackResponse(conversation.type);
        metadata.isFallback = true;
      }

      console.log(`[AI Orchestrator] Chat response generated successfully`);

      return {
        content: responseText,
        metadata
      };

    } catch (error) {
      console.error('[AI Orchestrator] Chat response error:', error);
      throw error;
    }
  }

  /**
   * Generate streaming chat response
   */
  async* generateStreamingChatResponse(conversationId, userMessage) {
    try {
      // Get conversation and context
      const conversation = await AIConversation.findById(conversationId)
        .populate('journalEntryId');

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const context = await contextBuilderService.buildConversationContext(conversation);

      // Crisis detection first (pass userId, not context)
      const crisisCheck = await crisisDetectionService.detectCrisis(userMessage, conversation.userId);

      if (crisisCheck.isCrisis) {
        // Send crisis event
        yield {
          type: 'crisis',
          data: {
            level: crisisCheck.riskLevel,
            resources: crisisCheck.resources
          }
        };

        // Generate and yield crisis response
        const crisisResponse = await crisisDetectionService.generateCrisisResponse(
          userMessage,
          crisisCheck
        );

        yield {
          type: 'complete',
          data: { content: crisisResponse }
        };

        return;
      }

      // Normal streaming response
      // Ensure correct argument types: (userMessage, conversationHistory[], journalContext[])
      const conversationHistory = context.conversation?.messages || [];
      const journalContext = context.currentJournal ? [context.currentJournal] : (context.recentJournals || []);

      const prompt = promptsService.buildChatPrompt(
        userMessage,
        conversationHistory,
        journalContext
      );

      const stream = huggingfaceService.generateTextStream(prompt, {
        temperature: 0.8,
        maxTokens: 400
      });

      let fullResponse = '';
      let chunkIndex = 0;

      for await (const chunk of stream) {
        fullResponse += chunk;
        
        yield {
          type: 'chunk',
          data: { content: chunk, index: chunkIndex++ }
        };

        // Periodic crisis check on accumulating response
        if (chunkIndex % 5 === 0) {
          const partialCrisis = await crisisDetectionService.detectCrisisKeywords(fullResponse);
          if (partialCrisis.detected) {
            yield {
              type: 'crisis-detected',
              data: { level: partialCrisis.riskLevel }
            };
          }
        }
      }

      yield {
        type: 'complete',
        data: { content: fullResponse }
      };

    } catch (error) {
      console.error('[AI Orchestrator] Streaming error:', error);
      yield {
        type: 'error',
        data: { error: error.message }
      };
    }
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  parseJSONResponse(response) {
    try {
      // Try direct parse first
      return JSON.parse(response);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/```\s*([\s\S]*?)\s*```/) ||
                       response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } catch {
          console.warn('[AI Orchestrator] Failed to parse JSON from response');
        }
      }
    }
    
    return {}; // Return empty object if parsing fails
  }

  /**
   * Validate AI response quality
   */
  validateResponse(response) {
    if (!response || typeof response !== 'string') return false;
    if (response.length < 10) return false;
    if (response.includes('[ERROR]') || response.includes('[FAIL]')) return false;
    
    // Check for empathy indicators (at least one should be present)
    const empathyIndicators = [
      'understand', 'feel', 'sounds', 'seems', 'might',
      'help', 'support', 'here', 'talk', 'share'
    ];
    
    const hasEmpathy = empathyIndicators.some(word => 
      response.toLowerCase().includes(word)
    );
    
    return hasEmpathy;
  }

  /**
   * Fallback sentiment analysis using keywords
   */
  getFallbackSentiment(content) {
    const positiveWords = ['happy', 'joy', 'excited', 'grateful', 'love', 'great', 'wonderful', 'amazing'];
    const negativeWords = ['sad', 'angry', 'depressed', 'anxious', 'worried', 'scared', 'hate', 'terrible'];

    const lowerContent = content.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;

    const score = (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);
    
    return {
      score: Math.max(-1, Math.min(1, score)),
      label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
      confidence: 0.6,
      primaryEmotions: [],
      reasoning: 'Keyword-based fallback analysis'
    };
  }

  /**
   * Generate suggested actions based on analysis
   */
  generateSuggestedActions(analysis) {
    const actions = [];

    // Based on sentiment
    if (analysis.sentiment.score < -0.5) {
      actions.push('Consider talking to a counselor or trusted friend');
      actions.push('Practice a grounding technique or deep breathing');
    } else if (analysis.sentiment.score > 0.5) {
      actions.push('Reflect on what contributed to these positive feelings');
      actions.push('Consider sharing this positivity with others');
    }

    // Based on risk
    if (analysis.risk.level === 'high') {
      actions.push(`Call the National Crisis Hotline: ${process.env.NATIONAL_CRISIS_HOTLINE || '988'}`);
      actions.push('Reach out to campus counseling services immediately');
    } else if (analysis.risk.level === 'medium') {
      actions.push('Schedule a check-in with a counselor this week');
      actions.push('Connect with your support network');
    }

    // Default action
    if (actions.length === 0) {
      actions.push('Continue journaling regularly to track your progress');
      actions.push('Explore coping resources in the app');
    }

    return actions.slice(0, 3); // Max 3 suggestions
  }

  /**
   * Generate journal reflection response (for embedded messages, not conversations)
   */
  async generateJournalReflection(userMessage, context) {
    try {
      console.log('[AI Orchestrator] Generating journal reflection...');

      // Build prompt with journal context
      const systemPrompt = `You are a compassionate mental health support AI helping a college student reflect on their journal entry. 

Journal Context:
${context.journalContent}

Previous Conversation:
${context.previousMessages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Provide empathetic, supportive responses that:
- Acknowledge their feelings
- Ask thoughtful follow-up questions
- Offer gentle insights when appropriate
- Watch for signs of crisis and provide resources if needed`;

      // Crisis detection
      const crisisCheck = await crisisDetectionService.detectCrisis(userMessage);

      if (crisisCheck.isCrisis) {
        const crisisResponse = await crisisDetectionService.generateCrisisResponse(
          userMessage,
          crisisCheck
        );

        return {
          content: crisisResponse,
          metadata: {
            isCrisis: true,
            riskLevel: crisisCheck.riskLevel,
            crisisResources: crisisCheck.resources,
            model: 'crisis-protocol'
          }
        };
      }

      // Generate normal reflection response
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      const responseText = await huggingfaceService.generateText(messages, {
        temperature: 0.8,
        maxTokens: 500,
        systemRole: 'journal-companion'
      });

      return {
        content: responseText,
        metadata: {
          isCrisis: false,
          riskLevel: 'low',
          model: 'glm-4.6'
        }
      };

    } catch (error) {
      console.error('[AI Orchestrator] Journal reflection error:', error);
      return {
        content: "I'm here to support you. I'm experiencing a brief technical issue reflecting on your journal, but your thoughts matter. Would you like to share more about how you're feeling?",
        metadata: {
          isCrisis: false,
          riskLevel: 'low',
          model: 'fallback',
          error: error.message
        }
      };
    }
  }

  /**
   * Get fallback response
   */
  getFallbackResponse(conversationType) {
    const fallbacks = {
      'journal-reflection': "I hear you, and your feelings are valid. While I'm having a moment processing your journal entry, please know that your thoughts matter. Would you like to share more about what's on your mind?",
      'general-chat': "I'm here to support you. I'm experiencing a brief technical issue, but I'm still listening. Could you tell me a bit more about how you're feeling right now?"
    };

    return fallbacks[conversationType] || fallbacks['general-chat'];
  }

  /**
   * Clear cache (for testing/debugging)
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new AIOrchestrator();
