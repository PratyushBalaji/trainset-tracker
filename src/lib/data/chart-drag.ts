import { addDays, clampIsoDate, daysBetween, minIsoDate } from './date';
import type { DateBounds } from './types';

export function createChartDrag(domain: DateBounds, maxDate: string) {
  const bounds = { ...domain };
  const end = minIsoDate(bounds.end, maxDate);
  return {
    bounds,
    dateAtRatio(ratio: number) {
      return clampIsoDate(addDays(bounds.start, Math.round(daysBetween(bounds.start, bounds.end) * Math.min(1, Math.max(0, ratio)))), bounds.start, end);
    }
  };
}
