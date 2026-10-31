export function kcal(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}

export function approx(n: number): string {
  return `~${kcal(roundTo(n, 10))}`;
}

export function range(low: number, high: number): string {
  return `${kcal(roundTo(low, 10))}–${kcal(roundTo(high, 10))}`;
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function longDate(date: Date): string {
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function clock(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${suffix}`;
}

export function mealForHour(h: number): 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' {
  if (h >= 5 && h < 11) return 'Breakfast';
  if (h >= 11 && h < 16) return 'Lunch';
  if (h >= 16 && h < 22) return 'Dinner';
  return 'Snack';
}
