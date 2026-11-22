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
  /** Milestone that fulfils this target, when it is not the section's passenger opening. */
  measuredBy?: string;
  /** Section id from the story's `sections`; omitted for single-section lines. */
  section?: string;
}

export interface ReviewedSpan {
  label: string;
  fromMilestoneId: string;
  toMilestoneId: string;
}

export interface ReviewedSection {
  id: string;
  label: string;
  /** Passenger opening of this section; null while it has not opened. */
  openingMilestoneId: string | null;
}

export interface ReviewedLineStory {
  openingMilestoneId: string;
  /** Lines that open in parts (Pink: elevated, underground) score each part separately. */
  sections?: ReviewedSection[];
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
  },
  // Pink opens in two parts, scored separately. Elevated targets are measured against the elevated
  // passenger opening (14 Nov 2026). Underground targets stay open until that section opens: passed
  // dates count as missed; later dates already replaced by a newer report count as pushed back.
  // Whole-line targets (Mar 2025, Dec 2024) covered both parts, so they are left unscored in the feed.
  // Reports that only restate a current target (ministry confirmation's revised dates, AIIB monitoring,
  // 20 Jun and 23 Aug elevated restatements, 20 Nov underground reaffirmation) are not counted again.
  pink: {
    openingMilestoneId: 'passenger-opening',
    sections: [
      { id: 'elevated', label: 'Elevated', openingMilestoneId: 'passenger-opening' },
      { id: 'underground', label: 'Underground', openingMilestoneId: null }
    ],
    targets: [
      { section: 'elevated', milestoneId: 'december-phased-forecast', field: 'revised_target', matches: 'December 2025 elevated; December 2026 underground', target: '2025-12-31', label: 'Dec 2025', kind: 'month' },
      // Known only as the earlier target in the 10 Aug 2025 ministry report; placed before the March 2026 move it preceded.
      { section: 'elevated', milestoneId: 'ministry-phased-schedule', field: 'previous_target', matches: 'September 2025 elevated; June 2026 underground', target: '2025-09-30', label: 'Sep 2025', kind: 'month' },
      { section: 'elevated', milestoneId: 'march-september2026-schedule-reported', field: 'revised_target', matches: 'March 2026 elevated; September 2026 underground', target: '2026-03-31', label: 'Mar 2026', kind: 'month' },
      { section: 'elevated', milestoneId: 'may2026-elevated-forecast', field: 'revised_target', matches: 'May 2026 elevated; December 2026 underground', target: '2026-05-31', label: 'May 2026', kind: 'month' },
      { section: 'elevated', milestoneId: 'june2026-elevated-forecast', field: 'revised_target', matches: 'End-May or June 2026', target: '2026-06-30', label: 'End-May / Jun 2026', kind: 'month' },
      { section: 'elevated', milestoneId: 'august15-internal-target', field: 'revised_target', matches: 'August 15, 2026', target: '2026-08-15', label: '15 Aug 2026', kind: 'by' },
      { section: 'elevated', milestoneId: 'late-september-elevated-forecast', field: 'revised_target', matches: 'Last week of September 2026, conditional', target: '2026-09-30', label: 'Last week of Sep 2026', kind: 'by' },
      { section: 'elevated', milestoneId: 'mid-october-elevated-forecast', field: 'revised_target', matches: 'Mid-October 2026', target: '2026-10-15', label: 'Mid-Oct 2026', kind: 'by' },
      { section: 'elevated', milestoneId: 'after-october15-opening-window', field: 'revised_target', matches: 'After October 15, 2026', target: '2026-10-15', label: 'After 15 Oct 2026', kind: 'not-before' },
      { section: 'elevated', milestoneId: 'tentative-november15-inauguration', field: 'revised_target', matches: 'Tentative November 15, 2026 inauguration', target: '2026-11-15', label: '15 Nov 2026 (inauguration)', kind: 'by', measuredBy: 'inauguration' },
      { section: 'elevated', milestoneId: 'november13-inauguration-reported', field: 'revised_target', matches: 'November 13, 2026 inauguration', target: '2026-11-13', label: '13 Nov 2026 (inauguration)', kind: 'by', measuredBy: 'inauguration' },
      { section: 'elevated', milestoneId: 'passenger-opening-announced', field: 'revised_target', matches: 'November 14, 2026 at 6 am', target: '2026-11-14', label: '14 Nov 2026 (passengers)', kind: 'by' },

      { section: 'underground', milestoneId: 'december-phased-forecast', field: 'revised_target', matches: 'December 2025 elevated; December 2026 underground', target: '2026-12-31', label: 'Dec 2026', kind: 'month' },
      // Earlier underground target named in the 10 Aug 2025 ministry report.
      { section: 'underground', milestoneId: 'ministry-phased-schedule', field: 'previous_target', matches: 'September 2025 elevated; June 2026 underground', target: '2026-06-30', label: 'Jun 2026', kind: 'month' },
      { section: 'underground', milestoneId: 'march-september2026-schedule-reported', field: 'revised_target', matches: 'March 2026 elevated; September 2026 underground', target: '2026-09-30', label: 'Sep 2026', kind: 'month' },
      { section: 'underground', milestoneId: 'may2026-elevated-forecast', field: 'revised_target', matches: 'May 2026 elevated; December 2026 underground', target: '2026-12-31', label: 'Dec 2026', kind: 'month' },
      { section: 'underground', milestoneId: 'ministerial-august15-and-march2027-forecast', field: 'revised_target', matches: 'August 15, 2026 elevated; March 2027 underground', target: '2027-03-31', label: 'Mar 2027', kind: 'month' },
      { section: 'underground', milestoneId: 'september-and-mid2027-forecast', field: 'revised_target', matches: 'September 2026 elevated; mid-2027 underground', target: '2027-06-30', label: 'Mid-2027', kind: 'month' },
      { section: 'underground', milestoneId: 'may2027-underground-target', field: 'revised_target', matches: 'May 2027', target: '2027-05-31', label: 'May 2027', kind: 'month' }
    ],
    spans: [
      { label: 'Final elevated segment → passengers', fromMilestoneId: 'elevated-final-segment', toMilestoneId: 'passenger-opening' },
      { label: 'First mainline run → passengers', fromMilestoneId: 'first-elevated-mainline-movement', toMilestoneId: 'passenger-opening' }
    ]
  }
};
