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
  ]
};

export function visibleMilestones<T extends { id: string }>(lineId: string, milestones: T[]): T[] {
  const hidden = new Set(hiddenMilestones[lineId] ?? []);
  return milestones.filter((m) => !hidden.has(m.id));
}
