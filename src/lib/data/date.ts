const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return toIsoDate(new Date(parseIsoDate(date).getTime() + days * DAY_MS));
}

export function daysBetween(start: string, end: string): number {
  return Math.max(0, Math.round((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / DAY_MS));
}

export function compareIsoDate(a: string, b: string): number {
  return parseIsoDate(a).getTime() - parseIsoDate(b).getTime();
}

export function clampIsoDate(date: string, start: string, end: string): string {
  if (compareIsoDate(date, start) < 0) return start;
  if (compareIsoDate(date, end) > 0) return end;
  return date;
}

export function maxIsoDate(...dates: string[]): string {
  return dates.sort(compareIsoDate).at(-1) ?? toIsoDate();
}

export function minIsoDate(...dates: string[]): string {
  return dates.sort(compareIsoDate)[0] ?? toIsoDate();
}

export function formatDate(date?: string): string {
  if (!date) return 'Not yet recorded';

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(parseIsoDate(date));
}

export function percentageBetween(date: string, start: string, end: string): number {
  const total = daysBetween(start, end);
  if (total === 0) return 0;
  return (daysBetween(start, date) / total) * 100;
}

export function makeMonthTicks(start: string, end: string): string[] {
  const cursor = parseIsoDate(start);
  cursor.setUTCDate(1);
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);

  const ticks: string[] = [];
  while (cursor <= parseIsoDate(end)) {
    ticks.push(toIsoDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return ticks;
}
