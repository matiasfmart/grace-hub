/**
 * Date Utilities
 *
 * Centralized date handling for the frontend.
 * All date conversions between API (string) and Domain (Date) happen here.
 */

/**
 * Parses a date string from the API to a Date object.
 * Supports both "YYYY-MM-DD" (DATE columns) and ISO format (TIMESTAMP columns).
 *
 * @param dateStr - Date string from API (e.g., "2025-01-15" or "2025-01-15T14:30:00.000Z")
 * @returns Date object or undefined if input is falsy
 */
export function parseApiDate(dateStr: string | undefined | null): Date | undefined {
  if (!dateStr) return undefined;

  // If it's already ISO format with time, parse directly
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  }

  // If it's YYYY-MM-DD format, add time to ensure UTC parsing
  const date = new Date(`${dateStr}T00:00:00Z`);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Formats a Date object to a localized display string.
 * Handles both Date objects and strings (for Next.js serialization compatibility)
 *
 * @param date - Date object or string to format
 * @param locale - Locale for formatting (default: 'es-ES')
 * @returns Formatted date string or 'N/A' if date is undefined/invalid
 */
export function formatDisplayDate(
  date: Date | string | undefined | null,
  locale: string = 'es-ES'
): string {
  if (!date) return 'N/A';

  // Handle both Date objects and strings (strings may come from Next.js serialization)
  // Use instanceof and check for getTime method to handle serialized objects
  let dateObj: Date;
  if (date instanceof Date && typeof date.getTime === 'function') {
    dateObj = date;
  } else {
    dateObj = new Date(String(date));
  }
  if (isNaN(dateObj.getTime())) return 'N/A';

  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC', // Important for DATE columns to avoid timezone shifts
  });
}

/**
 * Formats a Date object to a short display string.
 * Handles both Date objects and strings (for Next.js serialization compatibility)
 *
 * @param date - Date object or string to format
 * @param locale - Locale for formatting (default: 'es-ES')
 * @returns Formatted date string or 'N/A' if date is undefined/invalid
 */
export function formatShortDate(
  date: Date | string | undefined | null,
  locale: string = 'es-ES'
): string {
  if (!date) return 'N/A';

  // Handle both Date objects and strings (strings may come from Next.js serialization)
  let dateObj: Date;
  if (date instanceof Date && typeof date.getTime === 'function') {
    dateObj = date;
  } else {
    dateObj = new Date(String(date));
  }
  if (isNaN(dateObj.getTime())) return 'N/A';

  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Converts a Date object to YYYY-MM-DD string for API requests.
 * Used when sending DATE column values to the backend.
 *
 * @param date - Date object to convert
 * @returns YYYY-MM-DD string or undefined if date is undefined
 */
export function toApiDateString(date: Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return date.toISOString().split('T')[0];
}

/**
 * Converts a Date object to full ISO string for API requests.
 * Used when sending TIMESTAMP column values to the backend.
 *
 * @param date - Date object to convert
 * @returns ISO string or undefined if date is undefined
 */
export function toApiTimestampString(date: Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return date.toISOString();
}

/**
 * Checks if a date is valid.
 *
 * @param date - Date object to validate
 * @returns true if date is valid, false otherwise
 */
export function isValidDate(date: Date | undefined | null): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}
