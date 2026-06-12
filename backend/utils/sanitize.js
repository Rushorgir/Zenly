/**
 * URL and String Sanitization Utilities
 */

/**
 * Sanitizes a single URL string to ensure it uses safe protocols.
 * Prevents XSS attacks via javascript:, vbscript:, data:, or file: schemes.
 * 
 * @param {string} urlStr - The URL to sanitize.
 * @returns {string} - The sanitized URL (returns empty string if malicious/invalid).
 */
export const sanitizeUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return '';

  const trimmed = urlStr.trim();
  if (trimmed === '') return '';

  // Allow relative paths starting with / (but not //)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Detect malicious protocols case-insensitively
  const lowerUrl = trimmed.toLowerCase();
  if (
    lowerUrl.includes('javascript:') ||
    lowerUrl.includes('vbscript:') ||
    lowerUrl.includes('data:') ||
    lowerUrl.includes('file:')
  ) {
    return '';
  }

  // Ensure it's a valid URL with http: or https:
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    // Return empty if it has a protocol but is invalid, or if it doesn't match http/https
  }

  return '';
};

/**
 * Sanitizes markdown link targets and HTML href/src attributes inside a text block.
 * Replaces any dangerous URL references with empty string or safe placeholder.
 * 
 * @param {string} text - The input text or markdown.
 * @returns {string} - The sanitized text.
 */
export const sanitizeUrlSubstrings = (text) => {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // 1. Sanitize Markdown links [label](url)
  // Matching [label](url) but supporting nested parentheses safely without backtracking
  const markdownLinkRegex = /\[([^\]]*?)\]\(([^()\s]*(?:\([^()\s]*\)[^()\s]*)*)\)/g;
  sanitized = sanitized.replace(markdownLinkRegex, (match, label, url) => {
    const sanitizedUrl = sanitizeUrl(url);
    return `[${label}](${sanitizedUrl})`;
  });

  // 2. Sanitize HTML href/src attributes e.g., href="url" or src='url'
  const htmlAttrRegex = /(href|src)\s*=\s*(['"])(.*?)\2/gi;
  sanitized = sanitized.replace(htmlAttrRegex, (match, attr, quote, url) => {
    const sanitizedUrl = sanitizeUrl(url);
    return `${attr}=${quote}${sanitizedUrl}${quote}`;
  });

  // 3. Scan for any loose javascript: / vbscript: URLs directly in text
  const looseUrlRegex = /\b(javascript|vbscript|data|file):[^\s]+/gi;
  sanitized = sanitized.replace(looseUrlRegex, '');

  return sanitized;
};

export default {
  sanitizeUrl,
  sanitizeUrlSubstrings
};
