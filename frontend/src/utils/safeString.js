/**
 * Utility functions for safe string operations
 * Prevents errors when dealing with undefined/null values
 */

/**
 * Safely converts a value to lowercase string
 * @param {any} value - The value to convert
 * @returns {string} - Lowercase string or empty string if value is invalid
 */
export function safeToLowerCase(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value.toLowerCase()
  try {
    return String(value).toLowerCase()
  } catch (e) {
    // Error converting to lowercase
    return ''
  }
}

/**
 * Safely trims a string
 * @param {any} value - The value to trim
 * @returns {string} - Trimmed string or empty string if value is invalid
 */
export function safeTrim(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  try {
    return String(value).trim()
  } catch (e) {
    // Error trimming value
    return ''
  }
}

/**
 * Safely converts to lowercase and trims
 * @param {any} value - The value to process
 * @returns {string} - Lowercase trimmed string or empty string
 */
export function safeToLowerCaseTrim(value) {
  return safeTrim(safeToLowerCase(value))
}

/**
 * Safely checks if a string includes a substring
 * @param {any} str - The string to search in
 * @param {any} search - The substring to search for
 * @returns {boolean} - True if found, false otherwise
 */
export function safeIncludes(str, search) {
  const safeStr = safeToLowerCase(str)
  const safeSearch = safeToLowerCase(search)
  return safeStr.includes(safeSearch)
}
