import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDecimal',
  standalone: true
})
export class FormatDecimalPipe implements PipeTransform {

  transform(value: number | string | null | undefined): string {
    // Handle null/undefined values
    if (value === null || value === undefined || value === '') {
      return '0';
    }

    // Attempt to parse the value as a number
    const numValue = parseFloat(value.toString());

    // Check if the parsed value is a valid number
    if (!isNaN(numValue)) {
      // Round to avoid floating-point precision issues, then format
      const roundedValue = Math.round(numValue * 100) / 100;
      return roundedValue.toFixed(2).replace(/\.?0+$/, '');
    }

    // Return the value as a string if it's not a valid number
    return value.toString();
  }
}


