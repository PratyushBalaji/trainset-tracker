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
  /** How the section reads mid-sentence ("the earliest recorded ___ target"); defaults to the label. */
  noun?: string;
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
      { id: 'elevated', label: 'Elevated', noun: 'elevated', openingMilestoneId: 'passenger-opening' },
      { id: 'underground', label: 'Underground', noun: 'underground', openingMilestoneId: null }
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
  },
  // Green opened in five stages; each stage's targets are scored against that stage's own passenger
  // opening. Stage 2 (Nagasandra, 2015) has no stage-specific target on record, so it has no section.
  // Phase 1 completion targets are scored against Stage 3, the opening that completed Phase 1.
  // Not scored: the disputed "November 1" Silk Institute date (BMRCL's November clarification is used),
  // the unofficial October-November 2024 Madavara window, vague "2019, 2020, 2021" Madavara mentions,
  // and the 2017 / 2020 retrospective lists of earlier dates (reported long after they were set).
  green: {
    openingMilestoneId: 'madavara-passenger-opening',
    sections: [
      { id: 'stage1', label: 'First section', noun: 'first-section', openingMilestoneId: 'first-section-passenger-opening' },
      { id: 'stage3', label: 'Phase 1 completion', noun: 'Phase 1', openingMilestoneId: 'yelachenahalli-passenger-opening' },
      { id: 'stage4', label: 'Silk Institute', openingMilestoneId: 'silk-institute-passenger-opening' },
      { id: 'stage5', label: 'Madavara', openingMilestoneId: 'madavara-passenger-opening' }
    ],
    targets: [
      { section: 'stage1', milestoneId: 'april2013-first-section-target', field: 'revised_target', matches: 'April 2013', target: '2013-04-30', label: 'Apr 2013', kind: 'month' },
      { section: 'stage1', milestoneId: 'late2013-first-section-target', field: 'revised_target', matches: 'End-November / early-December 2013', target: '2013-12-07', label: 'End-Nov / early Dec 2013', kind: 'by' },
      { section: 'stage1', milestoneId: 'first-section-opening-announced', field: 'revised_target', matches: 'February 28, 2014 ceremony; March 1, 2014 passenger opening', target: '2014-03-01', label: '1 Mar 2014 (passengers)', kind: 'by' },

      // Baseline quoted in the Dec 2015 parliamentary answer; placed first as the earliest Phase 1 date.
      { section: 'stage3', milestoneId: 'phase1-june2016-parliament-target', field: 'previous_target', matches: 'December 2013 baseline in this parliamentary answer', target: '2013-12-31', label: 'Dec 2013 baseline', kind: 'month' },
      { section: 'stage3', milestoneId: 'phase1-march2015-budget-target', field: 'revised_target', matches: 'March 2015, Phase 1 completion', target: '2015-03-31', label: 'Mar 2015', kind: 'month' },
      { section: 'stage3', milestoneId: 'phase1-march2016-target', field: 'revised_target', matches: 'March 2016, Phase 1 completion', target: '2016-03-31', label: 'Mar 2016', kind: 'month' },
      { section: 'stage3', milestoneId: 'phase1-june2016-parliament-target', field: 'revised_target', matches: 'June 2016, Phase 1 completion', target: '2016-06-30', label: 'Jun 2016', kind: 'month' },
      { section: 'stage3', milestoneId: 'remaining-green-april2017-target', field: 'revised_target', matches: 'April 2017', target: '2017-04-30', label: 'Apr 2017', kind: 'month' },
      { section: 'stage3', milestoneId: 'remaining-green-may2017-target', field: 'revised_target', matches: 'End-May 2017', target: '2017-05-31', label: 'End-May 2017', kind: 'month' },
      { section: 'stage3', milestoneId: 'remaining-green-opening-announced', field: 'revised_target', matches: 'June 17, 2017 inauguration; June 18, 2017 passenger opening', target: '2017-06-18', label: '18 Jun 2017 (passengers)', kind: 'by' },

      { section: 'stage4', milestoneId: 'silk-institute-november1-forecast', field: 'previous_target', matches: 'August 15, 2020', target: '2020-08-15', label: '15 Aug 2020', kind: 'by' },
      { section: 'stage4', milestoneId: 'silk-institute-november-clarification', field: 'revised_target', matches: "November 2020, according to BMRCL's clarification", target: '2020-11-30', label: 'Nov 2020', kind: 'month' },
      { section: 'stage4', milestoneId: 'silk-institute-late2020-opening-window', field: 'revised_target', matches: 'Month-end November or first week December 2020', target: '2020-12-07', label: 'End-Nov / early Dec 2020', kind: 'by' },
      { section: 'stage4', milestoneId: 'silk-institute-middecember-target', field: 'revised_target', matches: 'Mid-December 2020', target: '2020-12-15', label: 'Mid-Dec 2020', kind: 'by' },
      { section: 'stage4', milestoneId: 'silk-institute-opening-announced', field: 'revised_target', matches: 'January 14, 2021 ceremony; January 15, 2021 public service', target: '2021-01-15', label: '15 Jan 2021 (passengers)', kind: 'by' },

      { section: 'stage5', milestoneId: 'madavara-january2022-target-report', field: 'revised_target', matches: 'January 2022', target: '2022-01-31', label: 'Jan 2022', kind: 'month' },
      { section: 'stage5', milestoneId: 'madavara-august2023-target', field: 'revised_target', matches: 'August 2023', target: '2023-08-31', label: 'Aug 2023', kind: 'month' },
      { section: 'stage5', milestoneId: 'madavara-september2023-forecast', field: 'revised_target', matches: 'September 2023', target: '2023-09-30', label: 'Sep 2023', kind: 'month' },
      // April 2024 is known only as the target the January 2024 report moved away from.
      { section: 'stage5', milestoneId: 'madavara-july2024-target', field: 'previous_target', matches: 'April 2024', target: '2024-04-30', label: 'Apr 2024', kind: 'month' },
      { section: 'stage5', milestoneId: 'madavara-july2024-target', field: 'revised_target', matches: 'July 2024', target: '2024-07-31', label: 'Jul 2024', kind: 'month' },
      { section: 'stage5', milestoneId: 'madavara-september2024-target', field: 'revised_target', matches: 'End-September 2024', target: '2024-09-30', label: 'End-Sep 2024', kind: 'month' },
      { section: 'stage5', milestoneId: 'madavara-september-october-window', field: 'revised_target', matches: 'End-September / first week October 2024', target: '2024-10-07', label: 'End-Sep / early Oct 2024', kind: 'by' },
      { section: 'stage5', milestoneId: 'madavara-october2024-target', field: 'revised_target', matches: 'Within October 2024', target: '2024-10-31', label: 'Oct 2024', kind: 'month' },
      { section: 'stage5', milestoneId: 'madavara-opening-announced', field: 'revised_target', matches: 'November 7, 2024 at 5 am', target: '2024-11-07', label: '7 Nov 2024 (passengers)', kind: 'by' }
    ],
    spans: []
  }
};
