import { formatDate, percentageBetween } from './date';
import { dateQualification, milestoneDateLabel } from './evidence';
import type { LineMilestone } from './line-types';
import type { ResolvedMilestone, ResolvedTrainset } from './types';

export interface TrainMilestoneGroup {
  label: string;
  title: string;
  milestone: ResolvedMilestone;
  sentence: string;
}
export interface HistoryEntry {
  id: string;
  sortDate: string;
  date?: string;
  title: string;
  tag: string;
  kind: 'line' | 'train' | 'today';
  lineMilestone?: LineMilestone;
  trainset?: ResolvedTrainset;
  groups?: TrainMilestoneGroup[];
}

const trainEvents: Record<string, { label: string; title: string; action: string }> = {
  factory_dispatch: { label: 'Dispatch', title: 'Factory Dispatch', action: 'Dispatched' },
  depot_arrival: { label: 'Delivery', title: 'Delivered', action: 'Delivered' },
  first_mainline_run: { label: 'First mainline run', title: 'First Mainline Run', action: 'First mainline run' },
  mainline_testing: { label: 'Testing', title: 'Mainline Testing Commenced', action: 'Testing commenced' },
  revenue_induction: { label: 'Induction', title: 'Inducted into Service', action: 'Inducted' }
};

export function trainMilestoneGroups(trainset: ResolvedTrainset, today: string): TrainMilestoneGroup[] {
  return trainset.milestones
    .filter((m) => trainEvents[m.key] && m.date <= today && (m.key !== 'factory_dispatch' || m.sources.length > 0))
    .map((milestone) => {
      const event = trainEvents[milestone.key];
      // Existing records carry date qualifications in comments, not a separate precision field.
      const qualification = dateQualification(milestone);
      const bounded = qualification.relation !== 'exact';
      const action = bounded && milestone.key === 'mainline_testing' ? (qualification.relation === 'before' ? 'Testing underway' : 'Testing record') : event.action;
      const label = milestoneDateLabel(milestone, true);
      return {
        label: event.label,
        title: bounded && milestone.key === 'mainline_testing' ? 'Mainline Testing (start uncertain)' : event.title,
        milestone,
        sentence: `${action} ${bounded ? label[0].toLowerCase() + label.slice(1) : `on ${label}`}`
      };
    });
}

export function historyDateLabel(milestone: LineMilestone): string {
  if (!milestone.date) {
    if (!milestone.period) return 'Date not established';
    const [year, month] = milestone.period.split('-');
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
  }
  const label = `${formatDate(milestone.date)}${milestone.presentation?.disputed ? ' (reported dates differ)' : ''}`;
  if (milestone.end_date) return `${label} to ${formatDate(milestone.end_date)}`;
  if (milestone.date_basis === 'reported_by') return `Reported by ${label}`;
  if (milestone.date_basis === 'reported_on') return `Reported on ${label}`;
  if (milestone.date_basis === 'derived') return `${label} (derived)`;
  return label;
}

export function buildLineTimeline(
  milestones: LineMilestone[], trainsets: ResolvedTrainset[], lineId: string, today: string
): HistoryEntry[] {
  const entries: HistoryEntry[] = milestones.map((milestone) => ({
    id: `line-${lineId}-${milestone.id}`, sortDate: milestone.date ?? milestone.period ?? '', date: milestone.date,
    title: milestone.title, tag: milestone.category, kind: 'line', lineMilestone: milestone
  }));

  for (const trainset of trainsets.filter((t) => t.displayLine === lineId)) {
    const groups = trainMilestoneGroups(trainset, today);
    if (!groups.length) continue;
    entries.push(...groups.map((group): HistoryEntry => ({
      id: `${trainset.id}-${group.milestone.key}`, sortDate: group.milestone.date, date: group.milestone.date,
      title: `${trainset.trainsetNumber} - ${group.title}`, tag: group.label, kind: 'train', trainset, groups: [group]
    })));
  }
  entries.push({ id: 'current-date', sortDate: today, date: today, title: 'Current date (IST)', tag: 'Today', kind: 'today' });
  return entries.sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

export function timelinePositions(entries: HistoryEntry[]): number[] {
  if (!entries.length) return [];
  const dates = entries.map((entry) => entry.date ?? `${entry.sortDate}-01`);
  return dates.map((date) => percentageBetween(date, dates[0], dates[dates.length - 1]));
}

export function visibleTimelineRange(anchors: number[], positions: number[], top: number, bottom: number): { start: number; end: number } {
  const positionAt = (y: number) => {
    const next = anchors.findIndex((anchor) => anchor > y);
    if (next === 0 || !anchors.length) return 0;
    if (next < 0) return 100;
    const fraction = Math.min(1, Math.max(0, (y - anchors[next - 1]) / (anchors[next] - anchors[next - 1])));
    return positions[next - 1] + fraction * (positions[next] - positions[next - 1]);
  };
  return { start: positionAt(top), end: positionAt(Math.max(top, bottom)) };
}

export function layoutTimelineLens(positions: number[], focusIndices: number[], range: { start: number; end: number }, width: number) {
  const nearest = positions.findIndex((p) => p >= range.start);
  const focus = focusIndices.length ? focusIndices : positions.length ? [nearest < 0 ? positions.length - 1 : nearest] : [];
  const first = focus[0] ?? 0;
  const last = focus[focus.length - 1] ?? 0;
  const before = first > 0 ? 38 : 0;
  const after = last < positions.length - 1 ? 38 : 0;
  const lensWidth = Math.min(width - before - after, Math.max((range.end - range.start) * width / 100, 160, focus.length * 28 + 32));
  const left = Math.max(before, Math.min(width - after - lensWidth, (range.start + range.end) * width / 200 - lensWidth / 2));
  const right = left + lensWidth;
  const markers: { indices: number[]; x: number; focused: boolean }[] = [];
  const cluster = (indices: number[], project: (p: number) => number) => {
    let previous: (typeof markers)[number] | undefined;
    for (const index of indices) {
      const x = project(positions[index]);
      if (previous && x - previous.x < 36) {
        previous.x = (previous.x * previous.indices.length + x) / (previous.indices.length + 1);
        previous.indices.push(index);
      } else {
        previous = { indices: [index], x, focused: false };
        markers.push(previous);
      }
    }
  };
  cluster(positions.map((_, i) => i).filter((i) => i < first), (p) => Math.max(18, Math.min(left - 22, p / Math.max(range.start, 0.001) * (left - 22))));
  focus.forEach((index, i) => markers.push({ indices: [index], x: focus.length === 1 ? (left + right) / 2 : left + 18 + i * (lensWidth - 36) / (focus.length - 1), focused: true }));
  cluster(positions.map((_, i) => i).filter((i) => i > last), (p) => Math.min(width - 18, Math.max(right + 22, right + 22 + (p - range.end) / Math.max(100 - range.end, 0.001) * (width - right - 22))));
  return { left, right, markers };
}
