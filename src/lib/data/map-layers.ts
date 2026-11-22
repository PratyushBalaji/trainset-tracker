// How Inkscape layer names in static/maps/namma-metro-layers.svg map to Route Map toggles.
// Layer names come straight from the map file (scripts/build-map.py keeps them as data-layer).

export interface MapPhase { id: string; label: string; layers: string[] }

/** Owner's phase grouping, line by line. Confirm or adjust here; unknown line layers fall into "Other". */
export const mapPhases: MapPhase[] = [
  { id: 'p1', label: 'Phase 1', layers: ['Purple Line', 'Green Line'] },
  { id: 'p2', label: 'Phase 2', layers: ['Yellow Line', 'Pink Line'] },
  { id: 'p2ab', label: 'Phase 2A / 2B', layers: ['Blue Line'] },
  { id: 'p3', label: 'Phase 3', layers: ['Orange Line', 'Silver Line'] },
  { id: 'p3a', label: 'Phase 3A', layers: ['Red Line'] }
];

/** Non-line layers, in panel order. */
export const mapDetailLayers = [
  { layer: 'Station Names', label: 'Station names' },
  { layer: 'Interchanges', label: 'Interchanges' },
  { layer: 'Landmarks', label: 'Landmarks' },
  { layer: 'Roads', label: 'Roads' },
  { layer: 'Icons', label: 'Legend icons' }
];

export const lineLayerColor: Record<string, string> = {
  'Purple Line': '#6b4aa0', 'Green Line': '#13824f', 'Yellow Line': '#d7a719', 'Pink Line': '#d35f8d',
  'Blue Line': '#2377b9', 'Red Line': '#d3242a', 'Orange Line': '#e0701f', 'Silver Line': '#9aa0a6'
};

export const isLineLayer = (name: string) => / Line$/.test(name);
