import { DateTime } from 'luxon';

export function getSystemTimezone(): string {
  try {
    return localStorage.getItem('system_timezone') || 'Asia/Riyadh';
  } catch {
    return 'Asia/Riyadh';
  }
}

/**
 * Returns a JS Date representing the current moment shifted to the system's timezone.
 * Used to initialize form controls and datepickers (e.g., p-calendar) with today's date in the company timezone.
 */
export function getSystemNow(userTimezone?: string): Date {
  const zone = userTimezone || getSystemTimezone();
  const dt = DateTime.now().setZone(zone);
  return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second);
}

function parseToDateTime(date: Date | string, defaultZone: string): DateTime | null {
  if (!date) return null;
  if (date instanceof Date) {
    const dt = DateTime.fromJSDate(date).setZone(defaultZone);
    return dt.isValid ? dt : null;
  }
  const str = date.toString().trim();
  let dt = DateTime.fromISO(str, { zone: 'utc' });
  if (!dt.isValid) {
    dt = DateTime.fromFormat(str, 'dd/MM/yyyy', { zone: 'utc' });
  }
  if (!dt.isValid) {
    dt = DateTime.fromFormat(str, 'yyyy-MM-dd', { zone: 'utc' });
  }
  if (!dt.isValid) {
    const jsDate = new Date(date);
    if (!isNaN(jsDate.getTime())) {
      dt = DateTime.fromJSDate(jsDate);
    } else {
      return null;
    }
  }
  dt = dt.setZone(defaultZone);
  return dt.isValid ? dt : null;
}

// Returns a UTC ISO string for server (e.g., "2025-06-10T13:43:32Z")
export function formatDateToUTCString(date: Date | string, userTimezone: string = 'local'): string {
  if (!date) return null;
  const zone = userTimezone === 'system' ? getSystemTimezone() : userTimezone;
  const dt = parseToDateTime(date, zone);
  return dt ? dt.toUTC().toISO({ suppressMilliseconds: true }) : null;
}

// Returns a localized readable string (e.g., "10/06/2025 01:43 PM")
export function formatDateToString(date: Date | string, userTimezone?: string, locale: string = 'ar-SA'): string {
  if (!date) return '';
  const zone = userTimezone || getSystemTimezone();
  const dt = parseToDateTime(date, zone);
  if (!dt) return '';
  return dt.setLocale(locale).reconfigure({ outputCalendar: 'gregory', numberingSystem: 'latn' }).toFormat('dd/MM/yyyy hh:mm a');
}

// Returns standard display date format "dd/MM/yyyy" (e.g., "10/06/2025")
export function formatDisplayDate(date: Date | string, userTimezone?: string): string {
  if (!date) return '';
  const zone = userTimezone || getSystemTimezone();
  const dt = parseToDateTime(date, zone);
  if (!dt) return '';
  return dt.setLocale('ar-SA').reconfigure({ outputCalendar: 'gregory', numberingSystem: 'latn' }).toFormat('dd/MM/yyyy');
}

// Returns ISO date-only format for backend API queries (e.g., "2025-06-10")
export function formatDateOnlyToString(date: Date | string, userTimezone?: string): string {
  if (!date) return '';
  const zone = userTimezone || getSystemTimezone();
  const dt = parseToDateTime(date, zone);
  if (!dt) return '';
  return dt.toFormat('yyyy-MM-dd');
}

// Converts from "dd/MM/yyyy" string to JS Date (using user timezone)
export function parseDateOnly(dateString: string, userTimezone: string = 'utc'): Date {
  if (!dateString) return new Date();
  // Expects "dd/MM/yyyy"
  const dt = DateTime.fromFormat(dateString, 'dd/MM/yyyy', { zone: userTimezone });
  return dt.isValid ? dt.toJSDate() : new Date();
}

/**
 * Converts a selected filter date to the start of day (00:00:00) in the system timezone represented as UTC ISO string.
 * e.g., if date is 2026-09-29 in Cairo (UTC+3), start of day UTC is 2026-09-28T21:00:00Z.
 */
export function formatStartOfDayToUTCString(date: Date | string, userTimezone?: string): string | null {
  if (!date) return null;
  const zone = userTimezone || getSystemTimezone();
  const dateStr = formatDateOnlyToString(date, zone);
  if (!dateStr) return null;
  const dt = DateTime.fromISO(dateStr, { zone }).startOf('day');
  return dt.isValid ? dt.toUTC().toISO({ suppressMilliseconds: true }) : null;
}

/**
 * Converts a selected filter date to the end of day (23:59:59) in the system timezone represented as UTC ISO string.
 * e.g., if date is 2026-09-29 in Cairo (UTC+3), end of day UTC is 2026-09-29T20:59:59Z.
 */
export function formatEndOfDayToUTCString(date: Date | string, userTimezone?: string): string | null {
  if (!date) return null;
  const zone = userTimezone || getSystemTimezone();
  const dateStr = formatDateOnlyToString(date, zone);
  if (!dateStr) return null;
  const dt = DateTime.fromISO(dateStr, { zone }).set({ hour: 23, minute: 59, second: 59, millisecond: 0 });
  return dt.isValid ? dt.toUTC().toISO({ suppressMilliseconds: true }) : null;
}

/**
 * Compares two dates ignoring time components. Returns true if both represent the same calendar day.
 */
export function isSameDate(date1: any, date2: any): boolean {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return !isNaN(d1.getTime()) && !isNaN(d2.getTime()) &&
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}


