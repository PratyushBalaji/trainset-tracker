// Line-history entries left off the Timeline feed to keep long histories readable.
// The records stay in lines.json with their sources; this only changes what the page shows.
// Each id must exist in lines.json (a test checks), so a renamed record can't silently reappear.

export const hiddenMilestones: Record<string, string[]> = {
  green: [
    // Paperwork superseded by the approval or agreement that follows it.
    'phase1-extension-dpr-oct2007',
    'phase1-extension-dpr-jun2008',
    'reach3b-letter-of-acceptance',
    'phase2-state-approval',
    'phase2-union-cabinet-approval',
    // Ceremonies a day before (or on) the passenger opening already listed.
    'first-section-inauguration',
    'nagasandra-inauguration',
    'silk-institute-inauguration',
    // Inspections whose authorisation is listed, and minor trial/inspection steps.
    'reach3b-cmrs-inspection',
    'remaining-green-cmrs-inspection',
    'silk-institute-cmrs-inspection',
    'madavara-cmrs-inspection',
    'madavara-ministerial-inspection-ride',
    'remaining-green-rdso-speed-trials'
  ],
  purple: [
    // Paperwork superseded by the approval, sanction or award listed next to it.
    'phase1-dpr-prepared',
    'state-approval-conveyed',
    'original-union-sanction',
    'phase2-union-sanction',
    'reach1-agreement',
    'extension-isa-engagement',
    // Ceremonies on (or a day before) a passenger opening already listed. Ceremonies a target is
    // measured against (Reach 2, Kengeri) and the late final-links ceremony stay.
    'reach1-inauguration',
    'underground-inauguration',
    'whitefield-inauguration',
    // Inspections whose authorisation is listed, and minor test steps.
    'underground-cmrs-inspection',
    'kengeri-cmrs-inspection',
    'whitefield-cmrs-inspection',
    'connecting-cmrs-inspection',
    'challaghatta-cmrs-inspection',
    'underground-both-track-dynamic-testing',
    'instrumented-oscillation-testing-reported',
    'whitefield-80kmh-trials'
  ],
  blue: [
    // Paperwork superseded by the approval, sanction or award listed next to it.
    'orr-dpr-submitted',
    'airport-alignment-cabinet-approval',
    'combined-proposal-forwarded',
    'planning-committee-approval',
    'orr-financial-bids',
    'adb-orr-contract-record',
    'airport-infrastructure-mous',
    // A second first-girder milestone; Package 3's is listed.
    'airport-package2-first-u-girder'
  ]
};

export function visibleMilestones<T extends { id: string }>(lineId: string, milestones: T[]): T[] {
  const hidden = new Set(hiddenMilestones[lineId] ?? []);
  return milestones.filter((m) => !hidden.has(m.id));
}
