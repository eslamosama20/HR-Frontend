export default function lazyLoadDebounce(func: (...args: any[]) => void, wait: number): (...args: any[]) => void {
  let timeout: any;
return (...args: any[]) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => func(...args), wait);
};
}
