// Contract summaries for the Home "Contracts" card.
// All procurement records come from trainsets.json; legacy orders are not tracked train by train.
import { todayIsoDate } from './date';
import { contractScopes } from './coverage';
import { lineOrder, rollingStockDesign, type TrainDesign } from './presentation';
import { dataset, decorateTrainsetForDate, resolvedTrainsets } from './resolve';
import type { Money, RawContract } from './types';

export interface ContractLineStat { line: string; delivered: number; inService: number; ordered?: number }

export interface ContractSummary {
  id: string;
  code: string;
  tracked: boolean;
  year?: string;
  awardee?: string;
  design?: TrainDesign;
  ordered?: number;
  orderedBasis?: 'trainsets' | 'cars';
  baseTrainsets?: number;
  baseCars?: number;
  carsPerTrain?: number;
  value?: Money;
  dates: { label: string; date?: string }[];
  variations: { date?: string; trainsets?: number; cars?: number; value?: Money; line?: string; comments?: string }[];
  manufacturers: string[];
  lines: string[];
  delivered: number;
  inService: number;
  perLine: ContractLineStat[];
  description?: string;
  orderDescription?: string;
  contractPeriod?: string;
  comments?: string;
  sources?: string[];
}

const details = dataset.contracts;

const delivered = (key: string) => key === 'factory_dispatch' || key === 'depot_arrival';

function trackedSummary(id: string, c: RawContract, today: string): ContractSummary {
  const trains = resolvedTrainsets.filter((t) => t.contractId === id);
  const dated = trains.map((t) => decorateTrainsetForDate(t, today));
  const isDelivered = (t: (typeof trains)[number]) => t.milestones.some((m) => delivered(m.key) && m.date <= today);
  const scope = contractScopes.find((s) => s.id === id);
  const carsPerTrain = dataset.rolling_stock[c.rolling_stock[0]]?.cars_per_trainset;
  const lines = lineOrder.filter((l) => trains.some((t) => t.displayLine === l) || (c.variations ?? []).some((v) => v.intended_line === l));
  const perLine = lines.map((line) => {
    const onLine = trains.filter((t) => t.displayLine === line);
    // Only a top-up names its line, so a per-line order size is known only when nothing else serves that line.
    const fromTopUps = (c.variations ?? []).filter((v) => v.intended_line === line).reduce((s, v) => s + (v.additional_trainsets ?? 0), 0);
    const baseServesLine = c.rolling_stock.some((rs) => (dataset.rolling_stock[rs]?.intended_lines ?? []).includes(line));
    return {
      line,
      delivered: onLine.filter(isDelivered).length,
      inService: dated.filter((t) => t.displayLine === line && t.currentStage.id === 'service').length,
      ordered: !baseServesLine && fromTopUps ? fromTopUps : undefined
    };
  });
  return {
    description: details[id]?.description,
    contractPeriod: details[id]?.contract_period,
    comments: details[id]?.comments,
    sources: details[id]?.sources,
    id,
    code: id.replace(/^bmrcl-/, '').toUpperCase(),
    tracked: true,
    year: c.awarded_on?.slice(0, 4),
    awardee: c.awardee,
    design: rollingStockDesign[c.rolling_stock[0]],
    ordered: scope?.ordered,
    orderedBasis: scope?.basis,
    baseTrainsets: c.base_trainsets ?? (c.base_cars && carsPerTrain ? c.base_cars / carsPerTrain : undefined),
    baseCars: c.base_cars,
    carsPerTrain,
    value: c.base_contract_value,
    dates: [
      { label: 'Tendered', date: c.tendered_on },
      { label: 'Awarded', date: c.awarded_on },
      { label: 'Signed', date: c.signed_on }
    ].filter((d) => d.date),
    variations: (c.variations ?? []).map((v) => ({ date: v.ordered_on, trainsets: v.additional_trainsets, cars: v.additional_cars, value: v.contract_value, line: v.intended_line })),
    manufacturers: [...new Set(trains.map((t) => t.manufacturer))],
    lines,
    delivered: trains.filter(isDelivered).length,
    inService: dated.filter((t) => t.currentStage.id === 'service').length,
    perLine
  };
}

/** Legacy procurement records do not contribute to tracked fleet totals. */
const legacy: ContractSummary[] = Object.keys(details).filter((id) => details[id].tracked === false).map((id) => ({
  id,
  code: id.replace(/^bmrcl-/, '').toUpperCase(),
  tracked: false,
  year: details[id].year,
  description: details[id].description,
  awardee: details[id].awardee,
  baseTrainsets: details[id].base_trainsets,
  baseCars: details[id].base_cars,
  orderDescription: details[id].order_description,
  value: details[id].base_contract_value,
  contractPeriod: details[id].contract_period,
  comments: details[id].comments,
  sources: [...new Set([...details[id].sources, ...(details[id].variations ?? []).flatMap((v) => v.sources ?? [])])],
  design: 'beml-og',
  dates: details[id].signed_on ? [{ label: 'Signed', date: details[id].signed_on }] : [],
  variations: (details[id].variations ?? []).map((v) => ({ date: v.ordered_on, trainsets: v.additional_trainsets, cars: v.additional_cars, value: v.contract_value, line: v.intended_line, comments: v.comments })),
  manufacturers: details[id].manufacturers ?? [],
  lines: details[id].lines ?? [],
  delivered: 0,
  inService: 0,
  perLine: []
}));

export function contractSummaries(today = todayIsoDate()): ContractSummary[] {
  const tracked = Object.entries(details).filter(([, c]) => c.tracked !== false).map(([id, c]) => trackedSummary(id, c, today));
  return [...legacy, ...tracked];
}

export function formatMoney(m?: Money): string | undefined {
  if (!m) return undefined;
  const symbol = m.currency === 'INR' ? '\u20b9' : `${m.currency} `;
  return `${symbol}${m.amount.toLocaleString('en-IN')} ${m.unit}`;
}
