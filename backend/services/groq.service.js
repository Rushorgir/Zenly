import { Groq } from 'groq-sdk';

class GroqService {
  constructor() {
    this.client = null;
    this.model = null;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize the client (lazy initialization to ensure env vars are loaded)
   */
  _ensureInitialized() {
    if (!this.client) {
      const apiKey = process.env.GROQ_API_KEY;
      this.client = new Groq({ apiKey });
      this.model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

      console.log('[Groq Service] Initialized with:', {
        model: this.model,
        hasToken: !!apiKey
      });
    }
  }

  /**
   * Format prompt into standard messages array
   */
  _formatMessages(prompt, options = {}) {
    const isMessagesArray = Array.isArray(prompt);
    let messagesPayload = [];

    if (isMessagesArray) {
      messagesPayload = prompt.map((m) => ({ role: m.role || 'user', content: m.content }));
    } else {
      if (options.systemRole) {
        messagesPayload.push({ role: 'system', content: options.systemRole });
      }
      if (prompt) {
        messagesPayload.push({ role: 'user', content: prompt });
      }
    }
    return messagesPayload;
  }

  /**
   * Generate text completion with retry logic
   * @param {string|Array} prompt - The prompt to send to the model
   * @param {object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<string>} - The generated text
   */
  async generateText(prompt, options = {}) {
    this._ensureInitialized();

    const defaultOptions = {
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 1,
      max_completion_tokens: parseInt(process.env.AI_MAX_TOKENS) || 8192,
      top_p: 1,
      reasoning_effort: 'medium',
      ...options
    };

    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[Groq Service] Generating text (attempt ${attempt}/${this.maxRetries})...`);

        const messagesPayload = this._formatMessages(prompt, options);

        const chatCompletion = await this.client.chat.completions.create({
          messages: messagesPayload,
          model: this.model,
          temperature: defaultOptions.temperature,
          max_completion_tokens: defaultOptions.max_completion_tokens,
          top_p: defaultOptions.top_p,
          stream: false,
          reasoning_effort: defaultOptions.reasoning_effort,
          stop: null
        });

        const responseText = chatCompletion?.choices?.[0]?.message?.content;

        if (responseText) {
          console.log('[Groq Service] Successfully generated text');
          return responseText.trim();
        }

        throw new Error('No content in response from model');
      } catch (error) {
        lastError = error;
        console.error(`[Groq Service] Attempt ${attempt} failed:`, error.message);

        if (
          error.message?.includes('unauthorized') ||
          error.message?.includes('invalid') ||
          error.message?.includes('rate limit exceeded')
        ) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[Groq Service] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    console.error(`[Groq Service] All ${this.maxRetries} attempts failed`);
    throw new Error(`Groq API failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Generate streaming text completion
   * @param {string|Array} prompt - The prompt to send to the model
   * @param {object} options - Additional options
   * @returns {AsyncGenerator<string>} - Stream of generated text chunks
   */
  async *generateTextStream(prompt, options = {}) {
    this._ensureInitialized();

    const defaultOptions = {
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 1,
      max_completion_tokens: parseInt(process.env.AI_MAX_TOKENS) || 8192,
      top_p: 1,
      reasoning_effort: 'medium',
      ...options
    };

    try {
      console.log('[Groq Service] Starting streaming generation...');

      const messagesPayload = this._formatMessages(prompt, options);

      const chatCompletionStream = await this.client.chat.completions.create({
        messages: messagesPayload,
        model: this.model,
        temperature: defaultOptions.temperature,
        max_completion_tokens: defaultOptions.max_completion_tokens,
        top_p: defaultOptions.top_p,
        stream: true,
        reasoning_effort: defaultOptions.reasoning_effort,
        stop: null
      });

      let receivedContent = false;
      for await (const chunk of chatCompletionStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          receivedContent = true;
          yield content;
        }
      }

      if (!receivedContent) {
        throw new Error('No content in streaming response');
      }
      console.log('[Groq Service] Successfully finished streaming text');
    } catch (error) {
      console.error('[Groq Service] Streaming error:', error);
      throw new Error(`Streaming failed: ${error.message}`, { cause: error });
    }
  }

  /**
   * Check if the service is healthy
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      console.log('[Groq Service] Running health check...');
      const response = await this.generateText('Hello', {
        max_completion_tokens: 10,
        temperature: 0.5
      });
      console.log('[Groq Service] Health check passed');
      return !!response;
    } catch (error) {
      console.error('[Groq Service] Health check failed:', error);
      return false;
    }
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Estimate token count (rough approximation)
   * @param {string} text
   * @returns {number}
   */
  estimateTokens(text) {
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

const groqService = new GroqService();
export default groqService;
