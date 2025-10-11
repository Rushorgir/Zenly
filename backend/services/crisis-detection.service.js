/**
 * Crisis Detection Service
 * Multi-layer safety system for detecting and responding to mental health crises
 */

import AI_CONFIG from '../config/ai.config.js';
import huggingFaceService from './huggingface.service.js';
import promptsService from './prompts.service.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';

class CrisisDetectionService {
  /**
   * Detect crisis from text using multi-layer approach
   * @param {string} text - Text to analyze
   * @param {string} userId - User ID for tracking
   * @returns {Promise<object>} - { isCrisis, riskLevel, keywords, aiAssessment, resources }
   */
  async detectCrisis(text, userId) {
    const result = {
      isCrisis: false,
      riskLevel: 'low',
      keywords: [],
      aiAssessment: null,
      resources: null,
      requiresAdminAlert: false,
    };

    // Layer 1: Keyword Detection (Instant)
    const keywordResult = this.detectCrisisKeywords(text);
    result.keywords = keywordResult.matchedKeywords;
    result.riskLevel = keywordResult.riskLevel;

    if (keywordResult.isCrisis) {
      result.isCrisis = true;
      
      // Layer 2: AI Assessment (2-3 seconds)
      try {
        const aiRiskLevel = await this.getAIRiskAssessment(text);
        result.aiAssessment = aiRiskLevel;
        
        // If AI confirms high risk, escalate
        if (aiRiskLevel === 'high') {
          result.riskLevel = 'high';
          result.requiresAdminAlert = true;
        }
      } catch (error) {
        console.error('AI risk assessment failed:', error);
        // Fall back to keyword-based assessment
      }

      // Layer 3: Get appropriate resources
      result.resources = this.getCrisisResources(result.riskLevel);

      // Alert admins for high-risk situations
      if (result.requiresAdminAlert) {
        await this.alertAdmins(userId, text, result);
      }

      // Log crisis event
      await this.logCrisisEvent(userId, text, result);
    }

    return result;
  }

  /**
   * Keyword-based crisis detection (Layer 1)
   * @param {string} text
   * @returns {object}
   */
  detectCrisisKeywords(text) {
    const lowerText = text.toLowerCase();
    const matchedKeywords = [];
    let riskLevel = 'low';
    let isCrisis = false;

    // Check high-risk keywords
    const highRiskKeywords = AI_CONFIG.CRISIS.RISK_LEVELS.HIGH;
    for (const keyword of highRiskKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        riskLevel = 'high';
        isCrisis = true;
      }
    }

    // Check medium-risk keywords (only if no high-risk found)
    if (!isCrisis) {
      const mediumRiskKeywords = AI_CONFIG.CRISIS.RISK_LEVELS.MEDIUM;
      for (const keyword of mediumRiskKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
          riskLevel = 'medium';
          isCrisis = true;
        }
      }
    }

    return { isCrisis, riskLevel, matchedKeywords };
  }

  /**
   * AI-based risk assessment (Layer 2)
   * @param {string} text
   * @returns {Promise<string>} - 'high', 'medium', or 'low'
   */
  async getAIRiskAssessment(text) {
    try {
      const prompt = promptsService.buildRiskAssessmentPrompt(text);
      const response = await huggingFaceService.generateText(prompt, {
        max_new_tokens: 10,
        temperature: 0.3, // Lower temperature for more consistent classification
      });

      const riskLevel = response.toLowerCase().trim();
      
      if (['high', 'medium', 'low'].includes(riskLevel)) {
        return riskLevel;
      }

      // Default to medium if unclear
      return 'medium';
    } catch (error) {
      console.error('AI risk assessment error:', error);
      return 'medium'; // Safe default
    }
  }

  /**
   * Get crisis resources based on risk level
   * @param {string} riskLevel
   * @returns {object}
   */
  getCrisisResources(riskLevel) {
    const resources = {
      riskLevel,
      hotlines: {
        national: {
          name: 'National Crisis Hotline',
          number: AI_CONFIG.CRISIS.HOTLINES.NATIONAL,
          available: '24/7',
        },
        campus: {
          name: 'Campus Counseling',
          info: AI_CONFIG.CRISIS.HOTLINES.CAMPUS,
        },
      },
      urgentMessage: null,
      suggestions: [],
    };

    if (riskLevel === 'high') {
      resources.urgentMessage = '🆘 URGENT: If you\'re in immediate danger, please call the National Crisis Hotline at ' + 
                                 AI_CONFIG.CRISIS.HOTLINES.NATIONAL + ' or dial 911.';
      resources.suggestions = [
        'Call the crisis hotline NOW - they have trained counselors available 24/7',
        'If you\'re on campus, go to the counseling center or campus safety',
        'Tell someone you trust - a friend, family member, or RA',
        'Don\'t stay alone - reach out immediately',
      ];
    } else if (riskLevel === 'medium') {
      resources.urgentMessage = '💙 You\'re going through a tough time. Please consider reaching out for professional support.';
      resources.suggestions = [
        'Schedule an appointment with campus counseling services',
        'Talk to a trusted friend, family member, or mentor',
        'Consider joining a support group',
        'Call the crisis hotline if you need someone to talk to: ' + AI_CONFIG.CRISIS.HOTLINES.NATIONAL,
      ];
    } else {
      resources.suggestions = [
        'Continue journaling and tracking your mood',
        'Practice self-care activities',
        'Reach out to campus counseling if things get harder',
        'Connect with friends and support networks',
      ];
    }

    return resources;
  }

  /**
   * Alert administrators about high-risk situation
   * @param {string} userId
   * @param {string} text
   * @param {object} crisisResult
   */
  async alertAdmins(userId, text, crisisResult) {
    try {
      // Get user info
      const user = await User.findById(userId).select('firstName lastName email');
      
      // Find all admins
      const admins = await User.find({ role: 'admin' }).select('_id');

      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        userId: admin._id,
        type: 'crisis_alert',
        title: '🆘 CRISIS ALERT - Immediate Attention Required',
        message: `User ${user.firstName} ${user.lastName} (${user.email}) may be in crisis. Risk Level: ${crisisResult.riskLevel.toUpperCase()}`,
        metadata: {
          affectedUserId: userId,
          affectedUserName: `${user.firstName} ${user.lastName}`,
          affectedUserEmail: user.email,
          riskLevel: crisisResult.riskLevel,
          keywords: crisisResult.keywords,
          timestamp: new Date(),
          messagePreview: text.substring(0, 200),
        },
        priority: 'high',
      }));

      await Notification.insertMany(notifications);

      console.log(`🚨 CRISIS ALERT: User ${userId} - Risk Level: ${crisisResult.riskLevel}`);
    } catch (error) {
      console.error('Failed to alert admins:', error);
    }
  }

  /**
   * Log crisis event for tracking and analysis
   * @param {string} userId
   * @param {string} text
   * @param {object} crisisResult
   */
  async logCrisisEvent(userId, text, crisisResult) {
    try {
      // TODO: Create a CrisisEvent model for better tracking
      console.log('Crisis Event Log:', {
        userId,
        timestamp: new Date(),
        riskLevel: crisisResult.riskLevel,
        keywords: crisisResult.keywords,
        aiAssessment: crisisResult.aiAssessment,
        textPreview: text.substring(0, 100),
      });

      // For now, we'll use the analytics events model
      const { default: AnalyticsEvent } = await import('../models/analysticsEvent.model.js');
      
      await AnalyticsEvent.create({
        userId,
        eventType: 'crisis_detected',
        eventData: {
          riskLevel: crisisResult.riskLevel,
          keywords: crisisResult.keywords,
          aiAssessment: crisisResult.aiAssessment,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log crisis event:', error);
    }
  }

  /**
   * Generate crisis response message
   * @param {string} userMessage
   * @param {object} crisisResult
   * @returns {Promise<string>}
   */
  async generateCrisisResponse(userMessage, crisisResult) {
    try {
      // Get AI-generated empathetic response
      const prompt = promptsService.buildCrisisResponsePrompt(userMessage, crisisResult.riskLevel);
      const aiResponse = await huggingFaceService.generateText(prompt, {
        max_new_tokens: 200,
        temperature: 0.7,
      });

      // Append crisis resources
      let fullResponse = aiResponse + '\n\n';
      fullResponse += crisisResult.resources.urgentMessage + '\n\n';
      fullResponse += '**Crisis Resources:**\n';
      fullResponse += `📞 National Crisis Hotline: ${crisisResult.resources.hotlines.national.number} (${crisisResult.resources.hotlines.national.available})\n`;
      fullResponse += `🏫 ${crisisResult.resources.hotlines.campus.info}\n\n`;
      
      if (crisisResult.resources.suggestions.length > 0) {
        fullResponse += '**Immediate Steps:**\n';
        crisisResult.resources.suggestions.forEach((suggestion, idx) => {
          fullResponse += `${idx + 1}. ${suggestion}\n`;
        });
      }

      return fullResponse;
    } catch (error) {
      console.error('Error generating crisis response:', error);
      
      // Fallback to template response
      return this.getFallbackCrisisResponse(crisisResult);
    }
  }

  /**
   * Get fallback crisis response if AI fails
   * @param {object} crisisResult
   * @returns {string}
   */
  getFallbackCrisisResponse(crisisResult) {
    let response = "I hear how much pain you're in right now, and I'm deeply concerned about your safety. ";
    response += "Your life has value, and you deserve support.\n\n";
    response += crisisResult.resources.urgentMessage + '\n\n';
    response += '**Crisis Resources:**\n';
    response += `📞 National Crisis Hotline: ${crisisResult.resources.hotlines.national.number} (${crisisResult.resources.hotlines.national.available})\n`;
    response += `🏫 ${crisisResult.resources.hotlines.campus.info}\n\n`;
    response += 'Please reach out to one of these resources right now. You don\'t have to face this alone.';
    
    return response;
  }
}

export default new CrisisDetectionService();
