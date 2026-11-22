import { formatDate } from './date';
import type { ResolvedMilestone } from './types';

export function dateQualification(milestone: ResolvedMilestone) {
  return milestone.presentation ?? { relation: milestone.comments ? 'uncertain' : 'exact' };
}

export function milestoneDateLabel(milestone?: ResolvedMilestone, numeric = false): string {
  if (!milestone) return 'Not recorded';
  const q = dateQualification(milestone);
  void numeric; // kept for callers; all dates now share one format
  const date = formatDate(milestone.date);
  const prefix = q.relation === 'after' ? 'On or after ' : q.relation === 'before' ? 'By ' : '';
  const flags = [q.relation === 'uncertain' ? 'unconfirmed date' : '', q.inferred ? 'inferred' : '', q.approximate ? 'approximate' : '', q.derived ? 'derived' : '', q.disputed ? 'disputed' : '', q.provisional ? 'identity provisional' : ''].filter(Boolean);
  return `${prefix}${date}${flags.length ? ` (${flags.join('; ')})` : ''}`;
}

export function referenceCount(count: number): string {
  return `${count} ${count === 1 ? 'reference' : 'references'}`;
}
