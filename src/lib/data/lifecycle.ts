import type {
  LifecycleStageDefinition,
  MilestoneKey,
  ResolvedMilestone,
  StageId,
  TimelineSegment
} from './types';
import { addDays, compareIsoDate, maxIsoDate, minIsoDate } from './date';

export const stageDefinitions: LifecycleStageDefinition[] = [
  {
    id: 'no_data',
    label: 'No data recorded',
    filterLabel: 'No data',
    description: 'No dated lifecycle milestones have been recorded yet.'
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    filterLabel: 'Manufacturing',
    description: 'The trainset has a recorded delivery path, but has not yet left the factory by the selected date.'
  },
  {
    id: 'dispatch',
    label: 'In dispatch',
    filterLabel: 'Dispatch',
    description: 'The trainset has left the factory and is in the delivery window.'
  },
  {
    id: 'testing',
    label: 'Testing',
    filterLabel: 'Testing',
    description: 'The trainset has arrived at depot or entered mainline trials.'
  },
  {
    id: 'service',
    label: 'In service',
    filterLabel: 'Service',
    description: 'The trainset has entered passenger service.'
  }
];

export const timelineStageDefinitions = stageDefinitions.filter((stage) => stage.id !== 'no_data');

export const milestoneLabels: Record<string, string> = {
  factory_dispatch: 'Factory dispatch',
  depot_arrival: 'Depot arrival',
  first_mainline_run: 'First mainline run',
  mainline_testing: 'Mainline testing',
  revenue_induction: 'Revenue induction'
};

const milestoneStages: Record<string, StageId> = {
  manufacturing: 'manufacturing',
  factory_dispatch: 'dispatch',
  depot_arrival: 'testing',
  first_mainline_run: 'testing',
  mainline_testing: 'testing',
  certification: 'testing',
  inspection: 'testing',
  revenue_induction: 'service'
};

export const stageColors: Record<StageId, { color: string; textColor: string; softColor: string }> = {
  no_data: {
    color: '#aeb6ad',
    textColor: '#17211d',
    softColor: '#ecefeb'
  },
  manufacturing: {
    color: '#c8baa1',
    textColor: '#3c3323',
    softColor: '#eee6d8'
  },
  dispatch: {
    color: '#dfab06',
    textColor: '#2f2707',
    softColor: '#f4e3ad'
  },
  testing: {
    color: '#2f7fbd',
    textColor: '#ffffff',
    softColor: '#c7e0f2'
  },
  service: {
    color: '#15884d',
    textColor: '#ffffff',
    softColor: '#c3e5d1'
  }
};

export function getStageDefinition(stageId: StageId): LifecycleStageDefinition {
  return stageDefinitions.find((stage) => stage.id === stageId) ?? getStageDefinition('manufacturing');
}

export function getMilestoneStage(milestoneKey: MilestoneKey): StageId {
  return milestoneStages[milestoneKey] ?? 'manufacturing';
}

export function getMilestone(milestones: ResolvedMilestone[], key: MilestoneKey): ResolvedMilestone | undefined {
  return milestones.find((milestone) => milestone.key === key);
}

export function getCurrentStage(
  milestones: ResolvedMilestone[],
  selectedDate: string
): { stage: LifecycleStageDefinition; statusDate?: string; statusMilestone?: ResolvedMilestone } {
  if (milestones.length === 0) {
    return { stage: getStageDefinition('no_data') };
  }

  const factoryDispatch = getMilestone(milestones, 'factory_dispatch');
  const depotArrival = getMilestone(milestones, 'depot_arrival');
  const firstMainlineRun = getMilestone(milestones, 'first_mainline_run');
  const mainlineTesting = getMilestone(milestones, 'mainline_testing');
  const revenueInduction = getMilestone(milestones, 'revenue_induction');

  if (revenueInduction && compareIsoDate(selectedDate, revenueInduction.date) >= 0) {
    return {
      stage: getStageDefinition('service'),
      statusDate: revenueInduction.date,
      statusMilestone: revenueInduction
    };
  }

  const testingStart = [firstMainlineRun, mainlineTesting, depotArrival]
    .filter((milestone): milestone is ResolvedMilestone => Boolean(milestone))
    .sort((a, b) => compareIsoDate(a.date, b.date))[0];

  if (testingStart && compareIsoDate(selectedDate, testingStart.date) >= 0) {
    return {
      stage: getStageDefinition('testing'),
      statusDate: testingStart.date,
      statusMilestone: testingStart
    };
  }

  if (factoryDispatch && compareIsoDate(selectedDate, factoryDispatch.date) >= 0) {
    return {
      stage: getStageDefinition('dispatch'),
      statusDate: factoryDispatch.date,
      statusMilestone: factoryDispatch
    };
  }

  return { stage: getStageDefinition('manufacturing') };
}

export function buildTimelineSegments(
  milestones: ResolvedMilestone[],
  chartStart: string,
  chartEnd: string
): TimelineSegment[] {
  const factoryDispatch = getMilestone(milestones, 'factory_dispatch');
  const depotArrival = getMilestone(milestones, 'depot_arrival');
  const firstMainlineRun = getMilestone(milestones, 'first_mainline_run');
  const mainlineTesting = getMilestone(milestones, 'mainline_testing');
  const revenueInduction = getMilestone(milestones, 'revenue_induction');

  const segments: TimelineSegment[] = [];

  if (factoryDispatch) {
    segments.push({
      id: 'manufacturing-window',
      stageId: 'manufacturing',
      label: 'Pre-dispatch window',
      start: maxIsoDate(chartStart, addDays(factoryDispatch.date, -70)),
      end: factoryDispatch.date,
      sourceMilestones: [],
      derived: true
    });
  }

  if (factoryDispatch) {
    const dispatchEnd = depotArrival?.date ?? addDays(factoryDispatch.date, 16);
    segments.push({
      id: 'dispatch-window',
      stageId: 'dispatch',
      label: 'Factory to depot',
      start: factoryDispatch.date,
      end: minIsoDate(dispatchEnd, chartEnd),
      sourceMilestones: [factoryDispatch, depotArrival].filter(
        (milestone): milestone is ResolvedMilestone => Boolean(milestone)
      ),
      derived: !depotArrival
    });
  }

  const testingStart = [firstMainlineRun, mainlineTesting, depotArrival]
    .filter((milestone): milestone is ResolvedMilestone => Boolean(milestone))
    .sort((a, b) => compareIsoDate(a.date, b.date))[0];

  if (testingStart) {
    const testingEnd = revenueInduction?.date ?? chartEnd;
    segments.push({
      id: 'testing-window',
      stageId: 'testing',
      label: 'Testing and commissioning',
      start: testingStart.date,
      end: minIsoDate(testingEnd, chartEnd),
      sourceMilestones: [testingStart, revenueInduction].filter(
        (milestone): milestone is ResolvedMilestone => Boolean(milestone)
      ),
      derived: !revenueInduction
    });
  }

  if (revenueInduction) {
    segments.push({
      id: 'service-window',
      stageId: 'service',
      label: 'Passenger service',
      start: revenueInduction.date,
      end: chartEnd,
      sourceMilestones: [revenueInduction],
      derived: true
    });
  }

  return segments.filter((segment) => compareIsoDate(segment.end, segment.start) >= 0);
}
