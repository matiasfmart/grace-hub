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

/**
 * Returns the current datetime as a string suitable for <input type="datetime-local">.
 * Format: "YYYY-MM-DDTHH:MM"
 */
export function nowLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

/**
 * Formats a prospect visitDate (ISO 8601 datetime string) for display.
 *
 * - New records (with a real timestamp): shows date + time.
 * - Legacy/migrated records (stored as T00:00:00.000Z or plain YYYY-MM-DD):
 *   shows only the date — the time is not reliable.
 *
 * @param dateStr - ISO 8601 string from the API
 * @param locale  - Locale for formatting (default: 'es-ES')
 */
export function formatProspectVisitDate(dateStr: string, locale = 'es-ES'): string {
  if (!dateStr) return '—';

  // Legacy plain date string e.g. "2025-04-10"
  const isPlainDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  if (isPlainDate) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  // Migrated record: stored as midnight UTC — no reliable time available
  const isMidnightUTC =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (isMidnightUTC) {
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      timeZone: 'UTC',
    });
  }

  // New record — show date and time in the user's local timezone
  return date.toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}
