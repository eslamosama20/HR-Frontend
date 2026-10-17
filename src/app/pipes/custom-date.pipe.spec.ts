import { CustomDatePipe } from './custom-date.pipe';
import { TimezoneService } from '../services/timezone.service';

describe('CustomDatePipe', () => {
  let pipe: CustomDatePipe;
  let mockTimezoneService: jasmine.SpyObj<TimezoneService>;

  beforeEach(() => {
    mockTimezoneService = jasmine.createSpyObj('TimezoneService', ['getTimezone']);
    mockTimezoneService.getTimezone.and.returnValue('Asia/Riyadh');
    pipe = new CustomDatePipe(mockTimezoneService);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return null when value is null or undefined or empty', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
    expect(pipe.transform('')).toBeNull();
  });

  it('should default to dd/MM/yyyy format and apply Asia/Riyadh timezone (+3)', () => {
    // 2026-09-29T12:00:00Z
    const input = '2026-09-29T12:00:00.000Z';
    const result = pipe.transform(input);
    expect(result).toBe('29/09/2026');
  });

  it('should format full time with "short" format', () => {
    // 2026-09-29T12:30:00Z -> 03:30 PM in Riyadh
    const input = '2026-09-29T12:30:00.000Z';
    const result = pipe.transform(input, 'short', 'Asia/Riyadh', 'en-US');
    expect(result).toBe('29/09/2026 03:30 PM');
  });

  it('should standardize legacy format "yyyy-MM-dd" to "dd/MM/yyyy"', () => {
    const input = '2026-09-29T10:00:00.000Z';
    const result = pipe.transform(input, 'yyyy-MM-dd');
    expect(result).toBe('29/09/2026');
  });

  it('should standardize "yyyy-MM-dd HH:mm:ss" to "dd/MM/yyyy HH:mm:ss"', () => {
    const input = '2026-09-29T10:30:15.000Z'; // 13:30:15 in Riyadh
    const result = pipe.transform(input, 'yyyy-MM-dd HH:mm:ss', 'Asia/Riyadh');
    expect(result).toBe('29/09/2026 13:30:15');
  });

  it('should standardize "YYYY/M/d h:mm a" to "dd/MM/yyyy hh:mm a"', () => {
    const input = '2026-09-29T10:30:00.000Z'; // 01:30 PM in Riyadh
    const result = pipe.transform(input, 'YYYY/M/d h:mm a', 'Asia/Riyadh', 'en-US');
    expect(result).toBe('29/09/2026 01:30 PM');
  });

  it('should handle Date objects correctly', () => {
    const date = new Date('2026-09-29T12:00:00.000Z');
    const result = pipe.transform(date, 'dd/MM/yyyy', 'Asia/Riyadh');
    expect(result).toBe('29/09/2026');
  });

  it('should return null for invalid date strings', () => {
    expect(pipe.transform('not-a-valid-date')).toBeNull();
  });

  it('should advance date when timezone shifts past UTC midnight', () => {
    // 2026-09-29 22:30 UTC -> 2026-09-30 01:30 in Riyadh (+3)
    const input = '2026-09-29T22:30:00.000Z';
    const result = pipe.transform(input, 'dd/MM/yyyy', 'Asia/Riyadh');
    expect(result).toBe('30/09/2026');
  });

  it('should format Arabic locale using Latin digits 0-9', () => {
    const input = '2026-09-29T12:00:00.000Z';
    const result = pipe.transform(input, 'dd/MM/yyyy', 'Asia/Riyadh', 'ar-SA');
    // Ensure English/Latin digits (29/09/2026) are returned, NOT Arabic-indic digits (٢٩/٠٩/٢٠٢٦)
    expect(result).toBe('29/09/2026');
    expect(result).not.toContain('٢');
  });

  it('should format shortTime correctly', () => {
    // 2026-09-29 12:30:00 UTC -> 03:30 PM in Riyadh
    const input = '2026-09-29T12:30:00.000Z';
    const result = pipe.transform(input, 'shortTime', 'Asia/Riyadh', 'en-US');
    expect(result).toBe('03:30 PM');
  });
});

