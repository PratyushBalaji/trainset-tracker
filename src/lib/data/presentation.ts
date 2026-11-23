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

// Opening order of each line's first section.
export const lineOrder = ['purple', 'green', 'yellow', 'pink', 'blue'];

export const lineShortLabels: Record<string, string> = { yellow: 'Yellow', green: 'Green', purple: 'Purple', pink: 'Pink', blue: 'Blue' };

/** Initialisms for compact labels such as Fleet group headers. */
export const manufacturerCodes: Record<string, string> = { 'CRRC Nanjing Puzhen': 'CRRC', 'Titagarh Rail Systems': 'TRSL', BEML: 'BEML' };

export const manufacturerShortLabels: Record<string, string> = { 'CRRC Nanjing Puzhen': 'CRRC', 'Titagarh Rail Systems': 'Titagarh', BEML: 'BEML' };

/** URL value for a maker filter on Fleet and Lifecycle, e.g. ?maker=titagarh. */
export const makerSlug = (maker: string) => (manufacturerShortLabels[maker] ?? maker).toLowerCase();

export type TrainDesign = 'beml-og' | 'crrc-trsl' | 'beml-new';

export const trainDesignLabels: Record<TrainDesign, string> = {
  'beml-og': 'BEML / BRMM (2RS-DM)',
  'crrc-trsl': 'CRRC / TRSL (4RS-DM)',
  'beml-new': 'BEML (5RS-DM)'
};

/** Icon for each tracked rolling stock family. */
export const rollingStockDesign: Record<string, TrainDesign> = {
  'bmrcl-4rs-dm-cbtc': 'crrc-trsl',
  'bmrcl-4rs-dm-dtg': 'crrc-trsl',
  'bmrcl-5rs-dm': 'beml-new'
};

/** Train designs running on each line, tracked or not, in the order shown. */
export const lineDesigns: Record<string, TrainDesign[]> = {
  purple: ['beml-og'],
  green: ['beml-og', 'crrc-trsl'],
  yellow: ['crrc-trsl'],
  pink: ['beml-new'],
  blue: ['beml-new']
};
