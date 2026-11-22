// Reviewed presentation mapping from prose opening targets in lines.json to plottable dates.
// Like reviewed-qualifications.ts, each entry only applies while its `matches` text equals the
// stored target text, so editing the dataset invalidates the mapping instead of silently drifting.
// `target` is the latest day the promise could be read as covering (end of month for month targets).

export type TargetKind = 'by' | 'month' | 'not-before' | 'option';

export interface ReviewedTarget {
  milestoneId: string;
  field: 'previous_target' | 'revised_target';
  matches: string;
  target: string;
  label: string;
  kind: TargetKind;
  /** Milestone that fulfils this target, when it is not the line's passenger opening. */
  measuredBy?: string;
}

export interface ReviewedSpan {
  label: string;
  fromMilestoneId: string;
  toMilestoneId: string;
}

export interface ReviewedLineStory {
  openingMilestoneId: string;
  targets: ReviewedTarget[];
  spans: ReviewedSpan[];
}

// NEEDS OWNER REVIEW: month readings of each reported target.
export const reviewedLineStories: Record<string, ReviewedLineStory> = {
  yellow: {
    openingMilestoneId: 'passenger-opening',
    targets: [
      { milestoneId: 'phased-opening-plan', field: 'previous_target', matches: 'December 2022, entire corridor', target: '2022-12-31', label: 'Dec 2022', kind: 'month' },
      { milestoneId: 'phased-opening-plan', field: 'revised_target', matches: 'June 2023: Bommasandra - Central Silk Board; December 2023: Central Silk Board - RV Road', target: '2023-06-30', label: 'Jun 2023 (first section)', kind: 'month' },
      { milestoneId: 'single-opening-plan', field: 'revised_target', matches: 'December 2023, entire corridor', target: '2023-12-31', label: 'Dec 2023', kind: 'month' },
      { milestoneId: 'feb2024-target', field: 'revised_target', matches: 'February 2024', target: '2024-02-29', label: 'Feb 2024', kind: 'month' },
      { milestoneId: 'yearend-target', field: 'revised_target', matches: 'End of 2024 / December 2024', target: '2024-12-31', label: 'Dec 2024', kind: 'month' },
      { milestoneId: 'january-target', field: 'revised_target', matches: 'January 2025', target: '2025-01-31', label: 'Jan 2025', kind: 'month' },
      { milestoneId: 'reduced-fleet-option', field: 'revised_target', matches: 'March / April 2025, exploratory option', target: '2025-04-30', label: 'Mar–Apr 2025 (option)', kind: 'option' },
      { milestoneId: 'may-target', field: 'revised_target', matches: 'By May 2025', target: '2025-05-31', label: 'May 2025', kind: 'by' },
      { milestoneId: 'july-forecast', field: 'revised_target', matches: 'Not before July-end, potentially later', target: '2025-07-31', label: 'Not before end-Jul 2025', kind: 'not-before' },
      { milestoneId: 'august15-forecast', field: 'revised_target', matches: 'By August 15', target: '2025-08-15', label: '15 Aug 2025', kind: 'by' },
      { milestoneId: 'inauguration-announcement', field: 'revised_target', matches: 'August 10 inauguration', target: '2025-08-10', label: '10 Aug 2025 (inauguration)', kind: 'by', measuredBy: 'inauguration' }
    ],
    spans: [
      { label: 'Civil work done → passengers', fromMilestoneId: 'civil-track-reported', toMilestoneId: 'passenger-opening' },
      { label: 'First mainline run → passengers', fromMilestoneId: 'first-mainline-movement', toMilestoneId: 'passenger-opening' }
    ]
  }
};
