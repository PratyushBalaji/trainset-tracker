import { percentageBetween } from './date';
import type { DateBounds } from './types';

/** Stacked step paths; events arrive in chronological order. */
export function buildServiceBands(events: { date: string; line: string }[], lines: string[], trainCount: number, bounds: DateBounds) {
  const height = 100;
  const x = (date: string) => percentageBetween(date, bounds.start, bounds.end) * 10;
  const scale = height / Math.max(1, trainCount);
  const counts = new Map<string, number>();
  const totals = new Map<string, Map<string, number>>();
  for (const event of events) {
    counts.set(event.line, (counts.get(event.line) ?? 0) + 1);
    totals.set(event.date, new Map(counts));
  }

  return lines.map((line, index) => {
    let top = `M ${x(bounds.start)} ${height}`;
    const bottom: string[] = [];
    let prevTop = height, prevBottom = height;
    for (const [date, cumulative] of totals) {
      const xd = x(date).toFixed(1);
      const below = lines.slice(0, index).reduce((sum, lower) => sum + (cumulative.get(lower) ?? 0), 0);
      const yb = height - below * scale;
      const yt = yb - (cumulative.get(line) ?? 0) * scale;
      top += ` L ${xd} ${prevTop.toFixed(1)} L ${xd} ${yt.toFixed(1)}`;
      bottom.push(`L ${xd} ${yb.toFixed(1)} L ${xd} ${prevBottom.toFixed(1)}`);
      prevTop = yt; prevBottom = yb;
    }
    const end = x(bounds.end).toFixed(1);
    return { line, d: `${top} L ${end} ${prevTop.toFixed(1)} L ${end} ${prevBottom.toFixed(1)} ${bottom.reverse().join(' ')} Z` };
  });
}
