/**
 * String utility functions for common text transformations.
 */

/**
 * Convert text to a URL-friendly slug.
 * Lowercases, trims, removes non-word characters (except spaces and hyphens),
 * replaces spaces/underscores with hyphens, collapses multiple hyphens,
 * and strips leading/trailing hyphens.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Truncate text to a maximum length, appending "..." if truncated.
 * If the text is shorter than or equal to maxLen, it is returned as-is.
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Capitalize the first character of a string.
 * Returns empty string for empty input.
 */
export function capitalize(text: string): string {
  if (text.length === 0) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Escape HTML special characters to prevent XSS.
 * Replaces &, <, >, ", and ' with their HTML entity equivalents.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip all HTML tags from a string.
 * Returns the text content without any HTML markup.
 */
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Convert a camelCase or PascalCase string to kebab-case.
 */
export function camelToKebab(text: string): string {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}
