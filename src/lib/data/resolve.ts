import rawDataset from '../../../trainsets.json';
import { addDays, maxIsoDate, minIsoDate, toIsoDate } from './date';
import {
  buildTimelineSegments,
  getCurrentStage,
  milestoneLabels,
  stageColors,
  stageDefinitions,
  timelineStageDefinitions
} from './lifecycle';
import type {
  DateBounds,
  DatedTrainset,
  LineId,
  RawDataset,
  RawRollingStock,
  ResolvedMilestone,
  ResolvedTrainset
} from './types';

export const dataset = rawDataset as RawDataset;

export const lineLabels: Record<string, string> = {
  yellow: 'Yellow Line',
  green: 'Green Line',
  purple: 'Purple Line',
  pink: 'Pink Line',
  blue: 'Blue Line'
};

export const lineColors: Record<string, string> = {
  yellow: '#d7a719',
  green: '#13824f',
  purple: '#6b4aa0',
  pink: '#d35f8d',
  blue: '#2377b9'
};

function lineLabel(line: LineId): string {
  return lineLabels[line] ?? `${line[0]?.toUpperCase() ?? ''}${line.slice(1)} Line`;
}

function parseTrainsetNumber(trainsetNumber: string): number {
  return Number(trainsetNumber.replace(/\D/g, '')) || 0;
}

function resolveRollingStock(base: RawRollingStock, overrides?: Partial<RawRollingStock>): RawRollingStock {
  return {
    ...base,
    ...overrides,
    intended_lines: overrides?.intended_lines ?? base.intended_lines
  };
}

function resolveMilestones(trainset: ResolvedTrainset | { milestones: ResolvedMilestone[] }): ResolvedMilestone[] {
  return trainset.milestones.sort((a, b) => a.date.localeCompare(b.date));
}

function makeResolvedMilestones(
  rawMilestones: RawDataset['trainsets'][string]['milestones']
): ResolvedMilestone[] {
  return Object.entries(rawMilestones ?? {})
    .map(([key, milestone]) => ({
      key,
      label: milestoneLabels[key] ?? key.replaceAll('_', ' '),
      date: milestone.date,
      sources: milestone.sources,
      comments: milestone.comments
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const baseTrainsets = Object.entries(dataset.trainsets)
  .map(([id, trainset]) => {
    const contract = dataset.contracts[trainset.contract];
    const rollingStockBase = dataset.rolling_stock[trainset.rolling_stock];

    if (!contract) {
      throw new Error(`Unknown contract "${trainset.contract}" on ${id}`);
    }

    if (!rollingStockBase) {
      throw new Error(`Unknown rolling stock "${trainset.rolling_stock}" on ${id}`);
    }

    const rollingStock = resolveRollingStock(rollingStockBase, trainset.overrides);
    const lineKeys = Array.from(
      new Set([trainset.intended_line, trainset.operational_line].filter((line): line is LineId => Boolean(line)))
    );
    const displayLine = trainset.operational_line ?? trainset.intended_line;

    return {
      id,
      uid: trainset.uid,
      trainsetNumber: trainset.trainset_number,
      sortNumber: parseTrainsetNumber(trainset.trainset_number),
      contractId: trainset.contract,
      contract,
      rollingStockId: trainset.rolling_stock,
      rollingStock,
      manufacturer: trainset.manufacturer,
      intendedLine: trainset.intended_line,
      operationalLine: trainset.operational_line,
      displayLine,
      lineKeys,
      lineSummary: lineLabel(displayLine),
      milestones: makeResolvedMilestones(trainset.milestones),
      timelineSegments: []
    } satisfies ResolvedTrainset;
  })
  .sort((a, b) => a.contractId.localeCompare(b.contractId) || a.sortNumber - b.sortNumber);

const milestoneDates = baseTrainsets.flatMap((trainset) => trainset.milestones.map((milestone) => milestone.date));
const earliestMilestone = milestoneDates.length > 0 ? minIsoDate(...milestoneDates) : toIsoDate();
const latestMilestone = milestoneDates.length > 0 ? maxIsoDate(...milestoneDates) : toIsoDate();

export const timelineBounds: DateBounds = {
  start: addDays(earliestMilestone, -80),
  end: maxIsoDate(addDays(latestMilestone, 80), toIsoDate())
};

export const resolvedTrainsets: ResolvedTrainset[] = baseTrainsets.map((trainset) => ({
  ...trainset,
  milestones: resolveMilestones(trainset),
  timelineSegments: buildTimelineSegments(trainset.milestones, timelineBounds.start, timelineBounds.end)
}));

export const manufacturerOptions = Array.from(
  new Set(resolvedTrainsets.map((trainset) => trainset.manufacturer))
).sort();

export const lineOptions = Array.from(new Set(resolvedTrainsets.flatMap((trainset) => trainset.lineKeys))).sort();

export { stageColors, stageDefinitions, timelineStageDefinitions };

export function decorateTrainsetForDate(trainset: ResolvedTrainset, selectedDate: string): DatedTrainset {
  const current = getCurrentStage(trainset.milestones, selectedDate);

  return {
    ...trainset,
    currentStage: current.stage,
    statusDate: current.statusDate,
    statusMilestone: current.statusMilestone
  };
}
