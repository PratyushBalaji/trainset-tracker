// Shared Fleet / Lifecycle state. Kept in a module so the selected date, filters and
// hidden trains survive moving between the two pages.
import { addDays, clampIsoDate, compareIsoDate, daysBetween, formatDate, todayIsoDate } from '$lib/data/date';
import { decorateTrainsetForDate, lineOptions, manufacturerOptions, resolvedTrainsets, timelineBounds } from '$lib/data/resolve';
import { lineOrder } from '$lib/data/presentation';
import type { LineId } from '$lib/data/types';

export const trackerToday = clampIsoDate(todayIsoDate(), timelineBounds.start, timelineBounds.end);
export const dateSliderMax = daysBetween(timelineBounds.start, timelineBounds.end);

const lineRank = (line: LineId) => {
  const index = lineOrder.indexOf(line);
  return index < 0 ? lineOrder.length : index;
};

/** Trainsets in line opening order, then contract, then number. */
export const orderedTrainsets = [...resolvedTrainsets].sort(
  (a, b) => lineRank(a.displayLine) - lineRank(b.displayLine) || a.contractId.localeCompare(b.contractId) || a.sortNumber - b.sortNumber
);

class TrackerState {
  selectedDate = $state(trackerToday);
  manufacturers = $state(new Set<string>(manufacturerOptions));
  lines = $state(new Set<LineId>(lineOptions));
  hidden = $state(new Set<string>(resolvedTrainsets.filter((t) => t.timelineSegments.length === 0).map((t) => t.id)));
  lastHiddenId = $state<string | null>(null);
  playing = $state(false);
  #timer: ReturnType<typeof setInterval> | null = null;

  get isToday() { return this.selectedDate === trackerToday; }
  get dateLabel() { return `${formatDate(this.selectedDate)}${this.isToday ? ' (today)' : ''}`; }
  get filtersActive() { return this.manufacturers.size !== manufacturerOptions.length || this.lines.size !== lineOptions.length; }

  get fleet() {
    return orderedTrainsets.filter((t) => this.manufacturers.has(t.manufacturer) && t.lineKeys.some((line) => this.lines.has(line)));
  }
  get dated() { return this.fleet.map((t) => decorateTrainsetForDate(t, this.selectedDate)); }

  setDate(date: string) { this.stop(); this.selectedDate = clampIsoDate(date, timelineBounds.start, timelineBounds.end); }
  setDateFromOffset(days: number) { this.setDate(addDays(timelineBounds.start, days)); }
  resetDate() { this.setDate(trackerToday); }

  /** Selecting one chip narrows to it; selecting it again (or "All") restores everything. */
  pickLine(line: LineId | null) {
    this.lines = line === null || (this.lines.size === 1 && this.lines.has(line)) ? new Set(lineOptions) : new Set([line]);
  }
  pickManufacturer(name: string | null) {
    this.manufacturers = name === null || (this.manufacturers.size === 1 && this.manufacturers.has(name)) ? new Set(manufacturerOptions) : new Set([name]);
  }
  clearFilters() { this.lines = new Set(lineOptions); this.manufacturers = new Set(manufacturerOptions); }

  toggleHidden(id: string) {
    const next = new Set(this.hidden);
    if (next.has(id)) { next.delete(id); if (this.lastHiddenId === id) this.lastHiddenId = null; }
    else { next.add(id); this.lastHiddenId = id; }
    this.hidden = next;
  }
  showAll() { this.hidden = new Set(); this.lastHiddenId = null; }

  stop() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    this.playing = false;
  }
  play(from: string) {
    this.stop();
    this.selectedDate = this.isToday ? from : this.selectedDate;
    this.playing = true;
    this.#timer = setInterval(() => {
      const next = clampIsoDate(addDays(this.selectedDate, 1), timelineBounds.start, timelineBounds.end);
      this.selectedDate = next;
      if (compareIsoDate(next, timelineBounds.end) >= 0) this.stop();
    }, 35);
  }
  togglePlay(from: string) { if (this.playing) this.stop(); else this.play(from); }
}

export const tracker = new TrackerState();
