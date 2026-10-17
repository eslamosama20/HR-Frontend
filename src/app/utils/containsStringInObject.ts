export default function containsStringInObject(obj:object, searchString:string):boolean {
  return Object.values(obj).some(value => {
    if (typeof value === 'string') {
      return value.toLowerCase().includes(searchString.toLowerCase());
    } else if (typeof value === 'object' && value !== null) {
      return this.containsStringInObject(value, searchString);
    }
    return false;
  });
}
