import { daysBetween } from './date';
import type { LineMilestone } from './line-types';
import type { HistoryEntry } from './line-timeline';
import { reviewedLineStories, type TargetKind } from './reviewed-targets';

export type TargetOutcome = 'missed' | 'met' | 'held' | 'not-taken' | 'pending' | 'superseded';

export interface OpeningTarget {
  milestoneId: string;
  /** Section this target belongs to (e.g. elevated / underground); 'line' when the line has one. */
  section: string;
  sectionLabel: string;
  /** Date the target was reported; absent for a target only known as an earlier one. */
  announced?: string;
  target: string;
  label: string;
  previousLabel?: string;
  kind: TargetKind;
  outcome: TargetOutcome;
  /** Calendar months between the target month and the actual opening month, when missed. */
  monthsLate?: number;
  /** Position within its section, and the section's total. */
  number: number;
  of: number;
}

export interface SectionStory {
  id: string;
  label: string;
  /** Mid-sentence wording for the section. */
  noun: string;
  opening?: { milestoneId: string; date: string };
  targets: OpeningTarget[];
  missed: number;
  earliest?: OpeningTarget;
  /** Latest target for a section that has not opened yet. */
  current?: OpeningTarget;
}

export interface DelayStory {
  targets: OpeningTarget[];
  sections: SectionStory[];
  /** First section's figures, kept for single-section lines (Yellow) and summaries. */
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

function outcomeOf(kind: TargetKind, target: string, opening: string | undefined, today: string, laterTargetExists: boolean): TargetOutcome {
  if (!opening) {
    if (target < today) return 'missed';
    // Not due yet: either still the live target, or already replaced by a later report.
    return laterTargetExists ? 'superseded' : 'pending';
  }
  if (kind === 'not-before') return opening >= target ? 'held' : 'missed';
  if (opening <= target) return 'met';
  return kind === 'option' ? 'not-taken' : 'missed';
}

/** Promise-versus-delivery story for a line, or null when no reviewed mapping applies. */
export function buildDelayStory(lineId: string, milestones: LineMilestone[], today: string): DelayStory | null {
  const story = reviewedLineStories[lineId];
  if (!story) return null;
  const byId = new Map(milestones.map((m) => [m.id, m]));
  const openingOf = (id?: string | null) => {
    const m = id ? byId.get(id) : undefined;
    return m?.date && m.date <= today ? { milestoneId: m.id, date: m.date } : undefined;
  };
  const sectionDefs = story.sections ?? [{ id: 'line', label: '', openingMilestoneId: story.openingMilestoneId }];

  // Mapping only applies while the stored prose still matches what was reviewed.
  const applicable = story.targets.filter((r) => byId.get(r.milestoneId)?.[r.field] === r.matches);

  const sections: SectionStory[] = sectionDefs.map((def) => {
    const opening = openingOf(def.openingMilestoneId);
    const reviewed = applicable.filter((r) => (r.section ?? 'line') === def.id);
    const targets: OpeningTarget[] = [];
    reviewed.forEach((r, i) => {
      const milestone = byId.get(r.milestoneId)!;
      const previous = r.field === 'revised_target' ? targets.at(-1) : undefined;
      const measured = r.measuredBy ? byId.get(r.measuredBy)?.date : opening?.date;
      const fulfilled = measured && measured <= today ? measured : undefined;
      const outcome = outcomeOf(r.kind, r.target, fulfilled, today, i < reviewed.length - 1);
      targets.push({
        milestoneId: milestone.id,
        section: def.id,
        sectionLabel: def.label,
        announced: r.field === 'revised_target' ? (milestone.date ?? (milestone.period ? `${milestone.period}-01` : undefined)) : undefined,
        target: r.target,
        label: r.label,
        previousLabel: previous?.label,
        kind: r.kind,
        outcome,
        monthsLate: outcome === 'missed' && fulfilled ? monthsBetween(r.target, fulfilled) : undefined,
        number: targets.length + 1,
        of: reviewed.length
      });
    });
    return {
      id: def.id,
      label: def.label,
      noun: def.noun ?? def.label,
      opening,
      targets,
      missed: targets.filter((t) => t.outcome === 'missed').length,
      earliest: targets[0],
      current: opening ? undefined : targets.at(-1)
    };
  });

  const spans = story.spans.flatMap((span) => {
    const from = byId.get(span.fromMilestoneId);
    const to = byId.get(span.toMilestoneId);
    const a = from && isoOf(from);
    const b = to && isoOf(to);
    return a && b && b <= today ? [{ label: span.label, months: monthsBetween(a, b), from: a, to: b }] : [];
  });

  const first = sections[0];
  return { targets: sections.flatMap((x) => x.targets), sections, opening: first?.opening, missed: first?.missed ?? 0, earliest: first?.earliest, spans };
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
