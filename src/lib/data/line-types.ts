export type DateBasis = 'event' | 'reported_on' | 'reported_by' | 'derived' | 'period';

export interface LineMilestone {
  id: string;
  title: string;
  category: 'Approval' | 'Construction' | 'Testing' | 'Certification' | 'Inspection' | 'Opening' | 'Deadline';
  date?: string;
  end_date?: string;
  period?: string;
  date_basis?: DateBasis;
  presentation?: { disputed: boolean };
  description: string;
  scope?: string;
  sources: string[];
  comments?: string;
  previous_target?: string;
  revised_target?: string;
}

export interface MetroLine {
  name: string;
  scope?: string;
  research_status: 'preliminary' | 'not_started';
  milestones: LineMilestone[];
}

export interface LinesDataset {
  schema_version: string;
  lines: Record<string, MetroLine>;
}
