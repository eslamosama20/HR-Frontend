import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';
import { TimezoneService } from '../services/timezone.service';

@Pipe({
  name: 'customDate',
  standalone: true,
})
export class CustomDatePipe implements PipeTransform {
  constructor(private tzService: TimezoneService) { }

  transform(value: any, format: string = 'dd/MM/yyyy', timezone?: string, locale: string = 'ar-SA'): string | null {
    if (!value) return null;
    if (timezone === '') timezone = null;
    const tz = timezone || this.tzService.getTimezone();

    let dt: DateTime;

    if (typeof value === 'string' || typeof value === 'number') {
      const strVal = value.toString().trim();
      dt = DateTime.fromISO(strVal, { zone: 'utc' });
      if (!dt.isValid) {
        dt = DateTime.fromFormat(strVal, 'dd/MM/yyyy', { zone: 'utc' });
      }
      if (!dt.isValid) {
        dt = DateTime.fromFormat(strVal, 'yyyy-MM-dd', { zone: 'utc' });
      }
      if (!dt.isValid) {
        const jsDate = new Date(value);
        if (!isNaN(jsDate.getTime())) {
          dt = DateTime.fromJSDate(jsDate);
        } else {
          return null;
        }
      }
    } else if (value instanceof Date) {
      dt = DateTime.fromJSDate(value);
    } else {
      return null;
    }

    if (!dt.isValid) return null;

    // Force locale but override calendar and numbering system
    dt = dt.setZone(tz).setLocale(locale).reconfigure({
      outputCalendar: 'gregory',
      numberingSystem: 'latn',
    });

    const resolvedFormat = this.convertAngularToLuxonFormat(format);
    return dt.toFormat(resolvedFormat);
  }

  private convertAngularToLuxonFormat(format: string): string {
    if (!format || format === 'shortDate' || format === 'mediumDate' || format === 'longDate' || format === 'fullDate') {
      return 'dd/MM/yyyy';
    }
    if (format === 'short' || format === 'ff') {
      return 'dd/MM/yyyy hh:mm a';
    }
    if (format === 'shortTime') {
      return 'hh:mm a';
    }
    if (format === 'medium') {
      return 'dd/MM/yyyy, hh:mm:ss a';
    }

    let resolved = format.trim();

    // Standardize any Year/Month/Day or Month/Day/Year combination to Day/Month/Year (dd/MM/yyyy)
    // while preserving any time tokens that follow (e.g., HH:mm:ss, hh:mm a)
    resolved = resolved
      .replace(/(?:yyyy|YYYY)[\/\-\.](?:MM|M)[\/\-\.](?:dd|d)/g, 'dd/MM/yyyy')
      .replace(/(?:dd|d)[\/\-\.](?:MM|M)[\/\-\.](?:yyyy|YYYY)/g, 'dd/MM/yyyy')
      .replace(/(?:MM|M)[\/\-\.](?:dd|d)[\/\-\.](?:yyyy|YYYY)/g, 'dd/MM/yyyy');

    // Replace uppercase Year tokens and month text tokens
    resolved = resolved
      .replace(/YYYY/g, 'yyyy')
      .replace(/YY/g, 'yy')
      .replace(/MMMM/g, 'LLLL')
      .replace(/MMM/g, 'LLL')
      .replace(/\bh\b/g, 'hh')
      .replace(/\bH\b/g, 'HH');

    return resolved;
  }
}
