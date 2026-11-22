import type { ResolvedMilestone } from './types';

// Reviewed against the existing milestone notes, not inferred by matching prose.
// Unlisted notes remain neutral. A changed stored date invalidates the annotation.
const reviewed: Record<string, { date: string } & NonNullable<ResolvedMilestone['presentation']>> = {
  'bmrcl-4rs-dm-ts003:factory_dispatch': { date: '2025-04-29', relation: 'exact' },
  'bmrcl-4rs-dm-ts004:factory_dispatch': { date: '2025-07-28', relation: 'exact' },
  'bmrcl-4rs-dm-ts004:depot_arrival': { date: '2025-08-13', relation: 'exact' },
  'bmrcl-4rs-dm-ts005:depot_arrival': { date: '2025-09-30', relation: 'exact' },
  'bmrcl-4rs-dm-ts006:factory_dispatch': { date: '2025-11-17', relation: 'exact' },
  'bmrcl-4rs-dm-ts006:depot_arrival': { date: '2025-12-02', relation: 'before' },
  'bmrcl-4rs-dm-ts009:depot_arrival': { date: '2026-04-14', relation: 'before' },
  'bmrcl-4rs-dm-ts009:mainline_testing': { date: '2026-04-30', relation: 'before' },
  'bmrcl-4rs-dm-ts010:factory_dispatch': { date: '2026-04-14', relation: 'uncertain' },
  'bmrcl-4rs-dm-ts010:mainline_testing': { date: '2026-05-30', relation: 'before' },
  'bmrcl-4rs-dm-ts011:revenue_induction': { date: '2026-07-22', relation: 'before' },
  'bmrcl-4rs-dm-ts012:factory_dispatch': { date: '2026-05-20', relation: 'uncertain', inferred: true },
  'bmrcl-4rs-dm-ts012:depot_arrival': { date: '2026-06-02', relation: 'before' },
  'bmrcl-4rs-dm-ts013:mainline_testing': { date: '2026-06-26', relation: 'before' },
  'bmrcl-4rs-dm-ts014:revenue_induction': { date: '2026-08-15', relation: 'before' },
  'bmrcl-4rs-dm-ts016:factory_dispatch': { date: '2024-12-20', relation: 'before' },
  'bmrcl-4rs-dm-ts016:depot_arrival': { date: '2025-01-12', relation: 'exact' },
  'bmrcl-4rs-dm-ts016:mainline_testing': { date: '2025-12-27', relation: 'before' },
  'bmrcl-4rs-dm-ts017:revenue_induction': { date: '2026-09-25', relation: 'before' },
  'bmrcl-4rs-dm-ts018:depot_arrival': { date: '2026-04-14', relation: 'before' },
  'bmrcl-4rs-dm-ts018:factory_dispatch': { date: '2026-03-13', relation: 'exact' },
  'bmrcl-4rs-dm-ts018:revenue_induction': { date: '2026-10-02', relation: 'before', provisional: true },
  'bmrcl-4rs-dm-ts019:factory_dispatch': { date: '2026-08-12', relation: 'before' },
  'bmrcl-4rs-dm-ts021:factory_dispatch': { date: '2026-09-15', relation: 'uncertain', approximate: true, derived: true },
  'bmrcl-4rs-dm-ts022:depot_arrival': { date: '2026-10-19', relation: 'before' },
  'bmrcl-5rs-dm-ts002:depot_arrival': { date: '2026-02-04', relation: 'uncertain', inferred: true },
  'bmrcl-5rs-dm-ts002:factory_dispatch': { date: '2026-02-02', relation: 'exact' },
  'bmrcl-5rs-dm-ts003:factory_dispatch': { date: '2026-02-25', relation: 'uncertain', inferred: true },
  'bmrcl-5rs-dm-ts004:factory_dispatch': { date: '2026-03-12', relation: 'uncertain', inferred: true },
  'bmrcl-5rs-dm-ts005:factory_dispatch': { date: '2026-03-22', relation: 'uncertain', inferred: true },
  'bmrcl-5rs-dm-ts005:depot_arrival': { date: '2026-03-23', relation: 'before' },
  'bmrcl-5rs-dm-ts006:factory_dispatch': { date: '2026-05-21', relation: 'uncertain', inferred: true },
  'bmrcl-5rs-dm-ts006:depot_arrival': { date: '2026-05-22', relation: 'before' },
  'bmrcl-5rs-dm-ts007:factory_dispatch': { date: '2026-06-03', relation: 'uncertain', inferred: true },
  'bmrcl-5rs-dm-ts008:factory_dispatch': { date: '2026-06-25', relation: 'uncertain', inferred: true },
  'bmrcl-5rs-dm-ts009:depot_arrival': { date: '2026-08-06', relation: 'before', provisional: true },
  'bmrcl-5rs-dm-ts010:depot_arrival': { date: '2026-08-06', relation: 'before', provisional: true },
  'bmrcl-5rs-dm-ts011:depot_arrival': { date: '2026-09-10', relation: 'before', provisional: true },
  'bmrcl-5rs-dm-ts012:depot_arrival': { date: '2026-10-01', relation: 'uncertain', provisional: true },
  'bmrcl-5rs-dm-ts013:depot_arrival': { date: '2026-10-15', relation: 'before', provisional: true }
};

export function reviewedQualification(id: string, key: string, date: string) {
  const record = reviewed[`${id}:${key}`];
  return record?.date === date ? record : undefined;
}
