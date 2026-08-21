export type StageId = 'no_data' | 'manufacturing' | 'dispatch' | 'testing' | 'service';

export type MilestoneKey =
  | 'factory_dispatch'
  | 'depot_arrival'
  | 'first_mainline_run'
  | 'mainline_testing'
  | 'revenue_induction'
  | string;

export type LineId = 'yellow' | 'green' | 'purple' | 'pink' | 'blue' | string;

export interface RawContract {
  uid: string;
  awardee: string;
  rolling_stock: string[];
}

export interface RawRollingStock {
  signalling: string;
  cars_per_trainset: number;
  gauge_mm: number;
  traction_power: string;
  carbody: string;
  intended_lines: LineId[];
}

export interface RawMilestone {
  date: string;
  sources: string[];
  comments?: string;
}

export interface RawTrainset {
  uid: string;
  contract: string;
  rolling_stock: string;
  trainset_number: string;
  manufacturer: string;
  intended_line: LineId;
  operational_line?: LineId;
  milestones: Record<MilestoneKey, RawMilestone>;
  overrides?: Partial<RawRollingStock>;
}

export interface RawDataset {
  schema_version: string;
  contracts: Record<string, RawContract>;
  rolling_stock: Record<string, RawRollingStock>;
  trainsets: Record<string, RawTrainset>;
}

export interface LifecycleStageDefinition {
  id: StageId;
  label: string;
  filterLabel: string;
  description: string;
}

export interface ResolvedMilestone {
  key: MilestoneKey;
  label: string;
  date: string;
  sources: string[];
  comments?: string;
}

export interface TimelineSegment {
  id: string;
  stageId: StageId;
  label: string;
  start: string;
  end: string;
  sourceMilestones: ResolvedMilestone[];
  derived: boolean;
}

export interface ResolvedTrainset {
  id: string;
  uid: string;
  trainsetNumber: string;
  sortNumber: number;
  contractId: string;
  contract: RawContract;
  rollingStockId: string;
  rollingStock: RawRollingStock;
  manufacturer: string;
  intendedLine: LineId;
  operationalLine?: LineId;
  displayLine: LineId;
  lineKeys: LineId[];
  lineSummary: string;
  milestones: ResolvedMilestone[];
  timelineSegments: TimelineSegment[];
}

export interface DatedTrainset extends ResolvedTrainset {
  currentStage: LifecycleStageDefinition;
  statusDate?: string;
  statusMilestone?: ResolvedMilestone;
}

export interface DateBounds {
  start: string;
  end: string;
}
