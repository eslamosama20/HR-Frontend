import { getSystemTimezone, getSystemNow, formatDateToUTCString, formatDateToString, formatDateOnlyToString, formatDisplayDate, parseDateOnly, formatStartOfDayToUTCString, formatEndOfDayToUTCString, isSameDate } from './dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    localStorage.removeItem('system_timezone');
  });

  describe('getSystemTimezone', () => {
    it('should return Asia/Riyadh by default if no timezone is stored', () => {
      expect(getSystemTimezone()).toBe('Asia/Riyadh');
    });

    it('should return stored timezone from localStorage', () => {
      localStorage.setItem('system_timezone', 'Africa/Cairo');
      expect(getSystemTimezone()).toBe('Africa/Cairo');
    });
  });

  describe('formatDateToUTCString', () => {
    it('should return null when date is null or undefined', () => {
      expect(formatDateToUTCString(null)).toBeNull();
      expect(formatDateToUTCString(undefined as any)).toBeNull();
    });

    it('should convert JS Date to UTC ISO string', () => {
      const date = new Date(Date.UTC(2026, 8, 29, 12, 0, 0)); // 2026-09-29T12:00:00Z
      const result = formatDateToUTCString(date, 'utc');
      expect(result).toContain('2026-09-29T12:00:00Z');
    });
  });

  describe('formatDateToString', () => {
    it('should format UTC date to localized string in Riyadh timezone', () => {
      const utcIso = '2026-09-29T12:00:00.000Z';
      const result = formatDateToString(utcIso, 'Asia/Riyadh', 'en-US');
      // 12:00 UTC + 3 hours = 03:00 PM
      expect(result).toBe('29/09/2026 03:00 PM');
    });

    it('should return empty string for null/empty date', () => {
      expect(formatDateToString('')).toBe('');
      expect(formatDateToString(null)).toBe('');
    });
  });

  describe('formatDateOnlyToString', () => {
    it('should return yyyy-MM-dd date part in target timezone', () => {
      const utcIso = '2026-09-29T22:00:00.000Z'; // 22:00 UTC = 01:00 AM next day (30th) in Riyadh (UTC+3)
      const result = formatDateOnlyToString(utcIso, 'Asia/Riyadh');
      expect(result).toBe('2026-09-30');
    });
  });

  describe('formatDisplayDate', () => {
    it('should format date to standard dd/MM/yyyy in target timezone', () => {
      const utcIso = '2026-09-29T22:00:00.000Z'; // 22:00 UTC = 01:00 AM 30th in Riyadh
      const result = formatDisplayDate(utcIso, 'Asia/Riyadh');
      expect(result).toBe('30/09/2026');
    });

    it('should return empty string for null or empty value', () => {
      expect(formatDisplayDate(null)).toBe('');
      expect(formatDisplayDate('')).toBe('');
    });
  });

  describe('parseDateOnly', () => {
    it('should parse dd/MM/yyyy correctly to JS Date', () => {
      const dateStr = '29/09/2026';
      const parsed = parseDateOnly(dateStr, 'utc');
      expect(parsed.getUTCFullYear()).toBe(2026);
      expect(parsed.getUTCMonth()).toBe(8); // September (0-indexed)
      expect(parsed.getUTCDate()).toBe(29);
    });
  });

  describe('getSystemNow', () => {
    it('should return a valid Date object representing current time', () => {
      const now = getSystemNow('Asia/Riyadh');
      expect(now instanceof Date).toBeTrue();
      expect(isNaN(now.getTime())).toBeFalse();
    });
  });

  describe('formatStartOfDayToUTCString & formatEndOfDayToUTCString', () => {
    it('should format start of day for Cairo timezone (UTC+3) correctly to UTC', () => {
      // 2026-09-29 00:00:00 Cairo is 2026-09-28 21:00:00 UTC
      const startUtc = formatStartOfDayToUTCString('2026-09-29', 'Africa/Cairo');
      expect(startUtc).toBe('2026-09-28T21:00:00Z');
    });

    it('should format end of day for Cairo timezone (UTC+3) correctly to UTC', () => {
      // 2026-09-29 23:59:59.999 Cairo is 2026-09-29 20:59:59 UTC
      const endUtc = formatEndOfDayToUTCString('2026-09-29', 'Africa/Cairo');
      expect(endUtc).toBe('2026-09-29T20:59:59Z');
    });

    it('should return null when input is null or empty', () => {
      expect(formatStartOfDayToUTCString(null)).toBeNull();
      expect(formatEndOfDayToUTCString(null)).toBeNull();
    });
  });

  describe('isSameDate', () => {
    it('should return true for the same calendar date with different times', () => {
      const d1 = new Date(2026, 9, 4, 8, 30, 0); // 4 Oct 2026 08:30
      const d2 = new Date(2026, 9, 4, 18, 45, 0); // 4 Oct 2026 18:45
      expect(isSameDate(d1, d2)).toBeTrue();
    });

    it('should return false for different calendar dates', () => {
      const d1 = new Date(2026, 9, 4);
      const d2 = new Date(2026, 9, 5);
      expect(isSameDate(d1, d2)).toBeFalse();
    });

    it('should return true for date strings and Date objects representing same day', () => {
      const d1 = '2026-10-04T00:00:00.000Z';
      const d2 = new Date(Date.UTC(2026, 9, 4));
      expect(isSameDate(d1, d2)).toBeTrue();
    });

    it('should return false when either date is null or invalid', () => {
      expect(isSameDate(null, new Date())).toBeFalse();
      expect(isSameDate(new Date(), undefined)).toBeFalse();
      expect(isSameDate('invalid-date', new Date())).toBeFalse();
    });
  });
});

