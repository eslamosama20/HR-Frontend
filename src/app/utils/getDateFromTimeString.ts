import { DateTime } from 'luxon';

export function getDateFromTimeString(time: string): Date {
  if (!time) return new Date();
  const parts = time.split(':').map(Number);
  const hours = isNaN(parts[0]) ? 0 : parts[0];
  const minutes = isNaN(parts[1]) ? 0 : parts[1];
  const seconds = isNaN(parts[2]) ? 0 : parts[2];

  // Construct today’s date in Cairo with the provided time
  const egyptTime = DateTime.now()
    .setZone('Africa/Cairo')
    .set({ hour: hours, minute: minutes, second: seconds });

  return egyptTime.toJSDate();
}
