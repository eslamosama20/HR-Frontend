
import { DateTime } from 'luxon';

export function formatDateOnly(date: Date | string): string | null {
  console.log("Original Date:", date);

  if (!date) return null;
  const dt = typeof date === 'string'
    ? DateTime.fromISO(date, { zone: 'Africa/Cairo' })
    : DateTime.fromJSDate(date).setZone('Africa/Cairo');
  console.log("Formatted Date:", dt.toFormat('yyyy-MM-dd'));

  return dt.toFormat('yyyy-MM-dd');
}

export function formatDateAndTime(date: Date | string): string | null {
  if (!date) return null;
  const dt = typeof date === 'string'
    ? DateTime.fromISO(date, { zone: 'Africa/Cairo' })
    : DateTime.fromJSDate(date).setZone('Africa/Cairo');

  return dt.toFormat('yyyy-MM-dd HH:mm');
}

export function unFormatDateOnly(date: Date | string): string {
  if (!date) return '';
  const dt = typeof date === 'string'
    ? DateTime.fromISO(date, { zone: 'Africa/Cairo' })
    : DateTime.fromJSDate(date).setZone('Africa/Cairo');

  return dt.toFormat('d/M/yyyy');
}

export function parseDateOnly(dateString: string): Date {
  if (!dateString) return new Date();

  let dt = DateTime.fromISO(dateString, { zone: 'Africa/Cairo' });

  if (!dt.isValid) {
    dt = DateTime.fromFormat(dateString, 'd/M/yyyy', {
      zone: 'Africa/Cairo',
    });
  }

  if (!dt.isValid) {
    throw new Error('Invalid date string');
  }

  return dt.toJSDate();
}
