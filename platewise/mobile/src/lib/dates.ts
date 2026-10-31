export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayKey(d: Date = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function keyDate(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftKey(k: string, days: number): string {
  const d = keyDate(k);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((keyDate(b).getTime() - keyDate(a).getTime()) / 86400000);
}

export function shortDate(k: string): string {
  const d = keyDate(k);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function weekdayShort(k: string): string {
  return WEEKDAYS[keyDate(k).getDay()].slice(0, 3);
}
