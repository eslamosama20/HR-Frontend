import { Injectable } from '@angular/core';
import { getSystemNow } from '../utils/dateUtils';

const DEFAULT_TZ = 'Asia/Riyadh';
const STORAGE_KEY = 'system_timezone';

@Injectable({ providedIn: 'root' })
export class TimezoneService {
  timezone: string = localStorage.getItem(STORAGE_KEY) || DEFAULT_TZ;

  setTimezone(tz: string) {
    if (tz) {
      this.timezone = tz;
      try {
        localStorage.setItem(STORAGE_KEY, tz);
      } catch (e) {
        console.warn('Could not save timezone to localStorage', e);
      }
    }
  }

  getTimezone(): string {
    return this.timezone || DEFAULT_TZ;
  }

  getNow(): Date {
    return getSystemNow(this.getTimezone());
  }
}

