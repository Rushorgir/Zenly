/**
 * Streaming Service
 * 
 * Handles Server-Sent Events (SSE) streaming for real-time AI responses
 * Provides efficient, progressive loading of AI-generated content
 */

import aiOrchestratorService from './ai-orchestrator.service.js';
import AIMessage from '../models/aiMessage.model.js';
import AIConversation from '../models/aiConversation.model.js';

class StreamingService {
  constructor() {
    this.activeStreams = new Map(); // Track active streaming connections
  }

  /**
   * Stream AI response via Server-Sent Events
   * @param {Response} res - Express response object
   * @param {string} conversationId - Conversation ID
   * @param {string} userMessage - User's message content
   * @param {string} userId - User ID for authorization
   */
  async streamAIResponse(res, conversationId, userMessage, userId) {
    const streamId = `${conversationId}-${Date.now()}`;
    
  console.log('[Streaming] Starting SSE stream: %s', streamId);

    // Configure SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // CORS headers for SSE
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Track this stream
    this.activeStreams.set(streamId, { conversationId, userId, startedAt: new Date() });

    // Send initial connection event
    this.sendEvent(res, 'connected', { streamId, conversationId });

    try {
      // Verify conversation ownership
      const conversation = await AIConversation.findOne({
        _id: conversationId,
        userId
      });

      if (!conversation) {
        this.sendEvent(res, 'error', {
          error: 'Conversation not found or access denied'
        });
        return res.end();
      }

      // Save user message first
      const userMsg = await AIMessage.create({
        conversationId,
        role: 'user',
        content: userMessage,
        status: 'delivered',
        createdAt: new Date()
      });

      this.sendEvent(res, 'message-saved', {
        messageId: userMsg._id,
        role: 'user'
      });

      // Create placeholder for AI message
      const aiMsg = await AIMessage.create({
        conversationId,
        role: 'assistant',
        content: '',
        status: 'sending',
        streaming: {
          isStreaming: true,
          chunksReceived: 0,
          complete: false,
          startedAt: new Date()
        }
      });

      this.sendEvent(res, 'ai-message-started', {
        messageId: aiMsg._id
      });

      // Stream the AI response
      const stream = aiOrchestratorService.generateStreamingChatResponse(
        conversationId,
        userMessage
      );

      let fullResponse = '';
      let chunkCount = 0;
      let crisisDetected = false;
      let crisisData = null;

      for await (const event of stream) {
        // Handle different event types
        switch (event.type) {
          case 'chunk':
            fullResponse += event.data.content;
            chunkCount++;

            // Send chunk to client
            this.sendEvent(res, 'chunk', {
              content: event.data.content,
              index: event.data.index,
              messageId: aiMsg._id
            });

            // Update message in DB periodically (every 10 chunks)
            if (chunkCount % 10 === 0) {
              await AIMessage.findByIdAndUpdate(aiMsg._id, {
                content: fullResponse,
                'streaming.chunksReceived': chunkCount
              });
            }
            break;

          case 'crisis':
          case 'crisis-detected':
            crisisDetected = true;
            crisisData = event.data;

            this.sendEvent(res, 'crisis', {
              level: event.data.level,
              resources: event.data.resources,
              messageId: aiMsg._id
            });

            // Update conversation status
            await AIConversation.findByIdAndUpdate(conversationId, {
              status: 'crisis',
              crisisDetected: true,
              crisisLevel: event.data.level,
              crisisTimestamp: new Date()
            });
            break;

          case 'complete':
            // If we have complete content from the event, use it
            if (event.data.content && event.data.content !== fullResponse) {
              fullResponse = event.data.content;
            }

            // Final update to message
            await AIMessage.findByIdAndUpdate(aiMsg._id, {
              content: fullResponse,
              status: 'delivered',
              'streaming.isStreaming': false,
              'streaming.complete': true,
              'streaming.chunksReceived': chunkCount,
              'streaming.completedAt': new Date(),
              ...(crisisDetected && {
                'aiMetadata.isCrisis': true,
                'aiMetadata.riskLevel': crisisData?.level
              })
            });

            // Send completion event
            this.sendEvent(res, 'complete', {
              messageId: aiMsg._id,
              totalChunks: chunkCount,
              finalContent: fullResponse,
              crisisDetected
            });

            // Update conversation stats
            await AIConversation.findByIdAndUpdate(conversationId, {
              $inc: { messageCount: 2 }, // User + AI message
              lastMessageAt: new Date()
            });
            break;

          case 'error':
            throw new Error(event.data.error);
        }
      }

      console.log('[Streaming] Stream completed: %s', streamId, {
        chunks: chunkCount,
        responseLength: fullResponse.length,
        crisis: crisisDetected
      });

    } catch (error) {
  console.error('[Streaming] Stream error: %s', streamId, error);

      // Send error event
      this.sendEvent(res, 'error', {
        error: error.message,
        retryable: this.isRetryableError(error)
      });

      // Mark message as error
      const lastMsg = await AIMessage.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .where('status').equals('sending');

      if (lastMsg) {
        await AIMessage.findByIdAndUpdate(lastMsg._id, {
          status: 'error',
          errorMessage: error.message,
          'streaming.isStreaming': false,
          'streaming.complete': false
        });
      }

    } finally {
      // Cleanup
      this.activeStreams.delete(streamId);
      res.end();
  console.log('[Streaming] Stream closed: %s', streamId);
    }
  }

  /**
   * Stream journal analysis progress
   */
  async streamJournalAnalysis(res, journalId, _userId) {
    const streamId = `journal-${journalId}-${Date.now()}`;
    
  console.log('[Streaming] Starting journal analysis stream: %s', streamId);

    // Configure SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    this.sendEvent(res, 'connected', { streamId, journalId });

    try {
      // Send progress updates for each analysis stage
      const stages = [
        { name: 'sentiment', progress: 0.25, label: 'Analyzing sentiment...' },
        { name: 'insights', progress: 0.5, label: 'Generating insights...' },
        { name: 'summary', progress: 0.75, label: 'Creating summary...' },
        { name: 'risk', progress: 0.9, label: 'Assessing risk level...' }
      ];

      for (const stage of stages) {
        this.sendEvent(res, 'progress', {
          stage: stage.name,
          progress: stage.progress,
          label: stage.label
        });

        // Small delay to make progress visible (remove in production)
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Perform actual analysis
      const analysis = await aiOrchestratorService.analyzeJournal(journalId);

      // Send completion with full results
      this.sendEvent(res, 'complete', {
        journalId,
        analysis
      });

  console.log('[Streaming] Journal analysis stream completed: %s', streamId);

    } catch (error) {
  console.error('[Streaming] Journal analysis error: %s', streamId, error);
      
      this.sendEvent(res, 'error', {
        error: error.message,
        retryable: this.isRetryableError(error)
      });

    } finally {
      res.end();
  console.log('[Streaming] Journal analysis stream closed: %s', streamId);
    }
  }

  /**
   * Send SSE event to client
   */
  sendEvent(res, event, data) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      
      // Ensure the data is flushed immediately
      if (res.flush && typeof res.flush === 'function') {
        res.flush();
      }
    } catch (error) {
      console.error('[Streaming] Error sending event:', error);
    }
  }

  /**
   * Send heartbeat to keep connection alive
   */
  sendHeartbeat(res) {
    this.sendEvent(res, 'heartbeat', { timestamp: Date.now() });
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'Rate limit exceeded',
      'Service temporarily unavailable'
    ];

    return retryableErrors.some(err => 
      error.message.includes(err) || error.code === err
    );
  }

  /**
   * Get active stream count
   */
  getActiveStreamCount() {
    return this.activeStreams.size;
  }

  /**
   * Get active streams for user
   */
  getUserActiveStreams(userId) {
    return Array.from(this.activeStreams.entries())
      .filter(([_, stream]) => stream.userId === userId)
      .map(([id, stream]) => ({ id, ...stream }));
  }

  /**
   * Close all streams (for shutdown)
   */
  closeAllStreams() {
  console.log('[Streaming] Closing all active streams (%d)', this.activeStreams.size);
    this.activeStreams.clear();
  }

  /**
   * Cleanup old streams (run periodically)
   */
  cleanupStaleStreams(maxAgeMinutes = 10) {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;

    for (const [streamId, stream] of this.activeStreams.entries()) {
      const age = now - stream.startedAt.getTime();
      if (age > maxAge) {
        console.log('[Streaming] Removing stale stream: %s', streamId);
        this.activeStreams.delete(streamId);
      }
    }
  }
}

export default new StreamingService();
