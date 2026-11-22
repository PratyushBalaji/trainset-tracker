import { formatDate } from './date';
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
      const label = milestoneDateLabel(milestone);
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
  // Same-day line records keep their lines.json order (the research lists them in sequence); the sort is stable.
  return entries.sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.kind.localeCompare(b.kind) || (a.kind === 'line' && b.kind === 'line' ? 0 : a.id.localeCompare(b.id)));
}
