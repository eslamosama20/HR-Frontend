export default function debounce(func: (...args: any[]) => void, wait: number, immediate = false) {
  let timeout: any;
  return function executedFunction(...args: any[]) {
    const context = this;
    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
