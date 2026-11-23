// What the dataset does and does not cover, kept apart from the trainset records.
import { dataset, resolvedTrainsets } from './resolve';
import type { OrderAllocation, ResolvedTrainset } from './types';

/**
 * Trains running outside the tracked contracts (legacy 2RS-DM / 3RS-DM fleets on Purple and Green).
 * Owner-supplied presentation figure, not a dataset record: update here when it changes.
 */
export const untrackedFleet = {
  trainsets: 57,
  lines: ['purple', 'green'],
  contracts: '2RS-DM and 3RS-DM',
  label: 'older trains on Purple and Green'
};

export const trackedContractsLabel = '4RS-DM and 5RS-DM';

interface ContractScope { id: string; ordered: number; basis: 'trainsets' | 'cars' }

type ContractRecord = { tracked?: boolean; base_trainsets?: number; base_cars?: number; base_allocations?: OrderAllocation[]; variations?: { additional_trainsets?: number; allocations?: OrderAllocation[] }[]; rolling_stock: string[] };

/** Trainsets ordered per contract: base order plus variations. Falls back to cars / cars per train. */
export const contractScopes: ContractScope[] = Object.entries(dataset.contracts as Record<string, ContractRecord>).flatMap(([id, contract]) => {
  if (contract.tracked === false) return [];
  const carsPerTrain = dataset.rolling_stock[contract.rolling_stock[0]]?.cars_per_trainset;
  const base = contract.base_trainsets ?? (contract.base_cars && carsPerTrain ? contract.base_cars / carsPerTrain : undefined);
  if (base === undefined || !Number.isInteger(base)) return [];
  const extra = (contract.variations ?? []).reduce((sum, v) => sum + (v.additional_trainsets ?? 0), 0);
  return [{ id, ordered: base + extra, basis: contract.base_trainsets ? 'trainsets' : 'cars' }];
});

export const orderedTrainsets = contractScopes.reduce((sum, c) => sum + c.ordered, 0);

/** Procurement totals are independent of delivered records, visibility and the date cursor. */
export function orderForFilters(lines: ReadonlySet<string> | undefined, manufacturers: ReadonlySet<string>) {
  let ordered = 0;
  const sharedPools = new Set<string>();
  for (const contract of Object.values(dataset.contracts as Record<string, ContractRecord>)) {
    if (contract.tracked === false) continue;
    const groups = [contract.base_allocations, ...(contract.variations ?? []).map((v) => v.allocations)];
    if (groups.some((group) => !group)) return { ordered: undefined, sharedPools: [] as string[] };
    for (const allocation of groups.flatMap((group) => group ?? [])) {
      if (!manufacturers.has(allocation.manufacturer) || (lines && !allocation.lines.some((line) => lines.has(line)))) continue;
      ordered += allocation.trainsets;
      if (lines && allocation.lines.some((line) => !lines.has(line))) sharedPools.add(allocation.lines.join('/'));
    }
  }
  return { ordered, sharedPools: [...sharedPools] };
}

const arrived = (t: ResolvedTrainset, date: string) => t.milestones.some((m) => (m.key === 'factory_dispatch' || m.key === 'depot_arrival') && m.date <= date);

/** Ordered trainsets with no dispatch or delivery on record by `date`. */
export function pendingOn(date: string): number {
  const counted = new Set(contractScopes.map((c) => c.id));
  const delivered = resolvedTrainsets.filter((t) => counted.has(t.contractId) && arrived(t, date)).length;
  return Math.max(0, orderedTrainsets - delivered);
}
