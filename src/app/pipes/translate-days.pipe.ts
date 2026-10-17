import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'translateDays'
})
export class TranslateDaysPipe implements PipeTransform {
  private dayTranslations: { [key: string]: string } = {
    Sunday: 'الأحد',
    Monday: 'الاثنين',
    Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء',
    Thursday: 'الخميس',
    Friday: 'الجمعة',
    Saturday: 'السبت'
  };

  transform(value: string): string {
    if (!value) return '';
    return value
      .split(',')
      .map(day => this.dayTranslations[day.trim()] || day)
      .join('، '); // Arabic comma
  }
}
