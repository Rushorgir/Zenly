import { InferenceClient } from '@huggingface/inference';

class HuggingFaceService {
  constructor() {
    // Don't initialize client yet - wait for first use to ensure env vars are loaded
    this.client = null;
    this.model = null;
    this.provider = 'novita'; // Use novita provider explicitly
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Initialize the client (lazy initialization to ensure env vars are loaded)
   */
  _ensureInitialized() {
    if (!this.client) {
      const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
      this.client = new InferenceClient(token);
      this.model = process.env.HUGGINGFACE_MODEL || 'zai-org/GLM-4.6';
      this.timeout = parseInt(process.env.AI_TIMEOUT_MS) || 30000;
      
      console.log('[HuggingFace Service] Initialized with:', {
        model: this.model,
        provider: this.provider,
        hasToken: !!token
      });
    }
  }

  /**
   * Generate text completion with retry logic
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<string>} - The generated text
   */
  async generateText(prompt, options = {}) {
    this._ensureInitialized(); // Ensure client is ready
    
    const defaultOptions = {
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 500,
      ...options
    };

    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[HuggingFace Service] Generating text (attempt ${attempt}/${this.maxRetries})...`);
        
        // Support two input styles: plain prompt string or message array
        const isMessagesArray = Array.isArray(prompt);
        const messagesPayload = isMessagesArray
          ? prompt.map((m) => ({ role: m.role || 'user', content: m.content }))
          : [
              { role: options.systemRole ? 'system' : 'user', content: options.systemRole || '' },
              { role: 'user', content: isMessagesArray ? '' : prompt }
            ].filter(m => m.content)

        const chatCompletion = await this.client.chatCompletion({
          provider: this.provider,
          model: this.model,
          messages: messagesPayload,
          temperature: defaultOptions.temperature,
          max_tokens: defaultOptions.max_tokens
        });

        const responseText = chatCompletion?.choices?.[0]?.message?.content;
        
        if (responseText) {
          console.log('[HuggingFace Service] Successfully generated text');
          return responseText.trim();
        }

        throw new Error('No content in response from model');
        
      } catch (error) {
        lastError = error;
        console.error(`[HuggingFace Service] Attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain errors
        if (error.message?.includes('unauthorized') || 
            error.message?.includes('invalid') ||
            error.message?.includes('rate limit exceeded')) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[HuggingFace Service] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    console.error(`[HuggingFace Service] All ${this.maxRetries} attempts failed`);
    throw new Error(`HuggingFace API failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Generate streaming text completion
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options
   * @returns {AsyncGenerator<string>} - Stream of generated text chunks
   */
  async* generateTextStream(prompt, options = {}) {
    this._ensureInitialized(); // Ensure client is ready
    
    const defaultOptions = {
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 500,
      ...options
    };

    try {
      console.log('[HuggingFace Service] Starting streaming generation...');
      
      // Note: chatCompletionStream may not be available on all providers
      // For now, we'll use the non-streaming version and yield the full response
      const chatCompletion = await this.client.chatCompletion({
        provider: this.provider,
        model: this.model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: defaultOptions.temperature,
        max_tokens: defaultOptions.max_tokens
      });

      const responseText = chatCompletion?.choices?.[0]?.message?.content;
      
      if (responseText) {
        console.log('[HuggingFace Service] Successfully generated streaming text');
        yield responseText;
      } else {
        throw new Error('No content in streaming response');
      }
      
    } catch (error) {
      console.error('[HuggingFace Service] Streaming error:', error);
      throw new Error(`Streaming failed: ${error.message}`);
    }
  }

  /**
   * Check if the service is healthy
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      console.log('[HuggingFace Service] Running health check...');
      const response = await this.generateText('Hello', {
        max_tokens: 10,
        temperature: 0.5
      });
      console.log('[HuggingFace Service] Health check passed');
      return !!response;
    } catch (error) {
      console.error('[HuggingFace Service] Health check failed:', error);
      return false;
    }
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estimate token count (rough approximation)
   * @param {string} text
   * @returns {number}
   */
  estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to fit within token limit
   * @param {string} text
   * @param {number} maxTokens
   * @returns {string}
   */
  truncateToTokenLimit(text, maxTokens) {
    const estimatedTokens = this.estimateTokens(text);
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    const maxChars = maxTokens * 4;
    return text.substring(0, maxChars) + '...';
  }
}

// Singleton instance
const huggingFaceService = new HuggingFaceService();

export default huggingFaceService;
