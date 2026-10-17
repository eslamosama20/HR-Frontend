export function isDate(value: Date | string | number) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return true;
  } else if (typeof value === 'string') {
    const parsedDate = Date.parse(value);
    return !isNaN(parsedDate);
  } else {
    return false;
  }
}
