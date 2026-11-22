import rawLines from '../../../lines.json';
import type { LinesDataset } from './line-types';

export const lines = (rawLines as LinesDataset).lines;
// Reviewed conflicts already documented in the Yellow Line evidence notes.
lines.yellow.milestones = lines.yellow.milestones.map((milestone) =>
  ['isa-certification', 'cmrs-authorisation'].includes(milestone.id)
    ? { ...milestone, presentation: { disputed: true } } : milestone);
