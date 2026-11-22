import { daysBetween } from './date';
import type { LineMilestone } from './line-types';
import type { HistoryEntry } from './line-timeline';
import { reviewedLineStories, type TargetKind } from './reviewed-targets';

export type TargetOutcome = 'missed' | 'met' | 'held' | 'not-taken' | 'pending';

export interface OpeningTarget {
  milestoneId: string;
  /** Date the target was reported; absent for a target only known as an earlier one. */
  announced?: string;
  target: string;
  label: string;
  previousLabel?: string;
  kind: TargetKind;
  outcome: TargetOutcome;
  /** Calendar months between the target month and the actual opening month, when missed. */
  monthsLate?: number;
  number: number;
}

export interface DelayStory {
  targets: OpeningTarget[];
  opening?: { milestoneId: string; date: string };
  missed: number;
  earliest?: OpeningTarget;
  spans: { label: string; months: number; from: string; to: string }[];
}

const isoOf = (m: LineMilestone) => m.date ?? (m.period ? `${m.period}-01` : undefined);

export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function durationLabel(days: number): string {
  const months = Math.round(days / 30.44);
  if (months < 1) return `${days} days`;
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} yr${rest ? ` ${rest} mo` : years === 1 ? '' : 's'}`;
}

function outcomeOf(kind: TargetKind, target: string, opening: string | undefined, today: string): TargetOutcome {
  if (!opening) return target < today ? 'missed' : 'pending';
  if (kind === 'not-before') return opening >= target ? 'held' : 'missed';
  if (opening <= target) return 'met';
  return kind === 'option' ? 'not-taken' : 'missed';
}

/** Promise-versus-delivery story for a line, or null when no reviewed mapping applies. */
export function buildDelayStory(lineId: string, milestones: LineMilestone[], today: string): DelayStory | null {
  const story = reviewedLineStories[lineId];
  if (!story) return null;
  const byId = new Map(milestones.map((m) => [m.id, m]));
  const openingMilestone = byId.get(story.openingMilestoneId);
  const opening = openingMilestone?.date && openingMilestone.date <= today ? { milestoneId: openingMilestone.id, date: openingMilestone.date } : undefined;

  const targets: OpeningTarget[] = [];
  for (const reviewed of story.targets) {
    const milestone = byId.get(reviewed.milestoneId);
    // Mapping only applies while the stored prose still matches what was reviewed.
    if (!milestone || milestone[reviewed.field] !== reviewed.matches) continue;
    const previous = reviewed.field === 'revised_target' ? targets.at(-1) : undefined;
    const measured = reviewed.measuredBy ? byId.get(reviewed.measuredBy)?.date : opening?.date;
    const fulfilled = measured && measured <= today ? measured : undefined;
    const outcome = outcomeOf(reviewed.kind, reviewed.target, fulfilled, today);
    targets.push({
      milestoneId: milestone.id,
      announced: reviewed.field === 'revised_target' ? milestone.date : undefined,
      target: reviewed.target,
      label: reviewed.label,
      previousLabel: previous?.label,
      kind: reviewed.kind,
      outcome,
      monthsLate: outcome === 'missed' && fulfilled ? monthsBetween(reviewed.target, fulfilled) : undefined,
      number: targets.length + 1
    });
  }

  const spans = story.spans.flatMap((span) => {
    const from = byId.get(span.fromMilestoneId);
    const to = byId.get(span.toMilestoneId);
    const a = from && isoOf(from);
    const b = to && isoOf(to);
    return a && b && b <= today ? [{ label: span.label, months: monthsBetween(a, b), from: a, to: b }] : [];
  });

  return { targets, opening, missed: targets.filter((t) => t.outcome === 'missed').length, earliest: targets[0], spans };
}

/** Days of silence after each entry, keyed by entry id, for gaps of at least `minDays`. */
export function timelineGaps(entries: HistoryEntry[], minDays = 120): Record<string, number> {
  const gaps: Record<string, number> = {};
  const dateOf = (entry: HistoryEntry) => entry.date ?? `${entry.sortDate}-01`;
  for (let i = 0; i < entries.length - 1; i++) {
    const days = daysBetween(dateOf(entries[i]), dateOf(entries[i + 1]));
    if (days >= minDays) gaps[entries[i].id] = days;
  }
  return gaps;
}
