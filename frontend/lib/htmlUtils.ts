/**
 * HTML Utility Functions for XSS Prevention
 */

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate and sanitize URL for safe use in src attributes
 */
export function validateUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  try {
    // Parse the URL to validate it
    const parsed = new URL(url, window.location.origin);
    
    // Allow only http, https, and data URLs (for base64 images)
    const allowedProtocols = ['http:', 'https:', 'data:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    
    // For data URLs, validate the format
    if (parsed.protocol === 'data:') {
      if (!url.startsWith('data:image/')) {
        return '';
      }
    }
    
    return url;
  } catch {
    // If URL parsing fails, return empty string
    return '';
  }
}

/**
 * Safely build HTML template literals
 */
export function safeHtml(strings: TemplateStringsArray, ...values: unknown[]): string {
  const escaped = values.map(value => {
    if (typeof value === 'string') {
      if (value.startsWith('http') || value.startsWith('data:')) {
        return validateUrl(value);
      }
      return escapeHtml(value);
    }
    return String(value);
  });
  
  return strings.reduce((result, str, i) => {
    return result + str + (escaped[i] || '');
  }, '');
}

/**
 * Create a safe HTML template literal tag function
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return safeHtml(strings, ...values);
}
