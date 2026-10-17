function formatDate(date: Date | string): string {
  if (!date) return '';
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(date)) {
      return date.replace(/Z$/i, '').replace(/([+-]\d{2}:\d{2})$/, '');
    }
    const d = new Date(date.replace(/Z$/i, '').replace(/([+-]\d{2}:\d{2})$/, ''));
    if (!isNaN(d.getTime())) {
      date = d;
    } else {
      return date;
    }
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');

  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

function parseFormattedDate(formattedDate: string): Date {
  if (!formattedDate) return new Date();
  const clean = formattedDate.replace(/Z$/i, '').replace(/([+-]\d{2}:\d{2})$/, '');
  const d = new Date(clean);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}

export { formatDate, parseFormattedDate };
