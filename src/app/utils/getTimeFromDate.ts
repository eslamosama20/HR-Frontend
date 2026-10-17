import { DateTime } from 'luxon';

export function getTimeFromDate(date: Date | string): string {
  if (!date) return '';
  if (typeof date === 'string') {
    if (/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(date.trim())) {
      const parts = date.trim().split(':');
      const h = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const s = (parts[2] || '00').padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      date = d;
    } else {
      return date;
    }
  }
  const egyptTime = DateTime.fromJSDate(date).setZone('Africa/Cairo');
  return egyptTime.toFormat('HH:mm:00');
}
