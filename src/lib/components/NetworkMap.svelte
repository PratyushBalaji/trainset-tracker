<script lang="ts">
  import { networkPaths, networkViewBox } from '$lib/data/network-map';
  import { lineColors, lineLabels } from '$lib/data/presentation';

  // With no selectedLine every line is drawn in its colour (Home); otherwise others are dimmed.
  // With a segment, the whole network is grey and only that stretch is coloured (Stats).
  let { selectedLine = null, segment = null, segmentLabel = null, caption = true, weight = 3.5 }: { selectedLine?: string | null; segment?: string | null; segmentLabel?: string | null; caption?: boolean; weight?: number } = $props();
  let labelled = $derived(segment && segmentLabel ? networkPaths.find((p) => p.segment === segment && p.labelAt) : undefined);
  let label = $derived(selectedLine ? `Namma Metro schematic network, ${lineLabels[selectedLine]} highlighted` : 'Namma Metro schematic network');
  const lit = (path: (typeof networkPaths)[number]) => (segment ? path.segment === segment : !selectedLine || path.line === selectedLine);
</script>

<figure style={`--weight: ${weight}`} class:segment>
  <svg viewBox={networkViewBox} role="img" aria-label={label}>
    <title>{selectedLine ? `${lineLabels[selectedLine]} in the Namma Metro network` : 'Namma Metro network'}</title>
    {#each networkPaths.filter((path) => !lit(path) && (segment || selectedLine)) as path}
      <path d={path.d} transform={path.transform} stroke={segment ? '#b8bfb6' : lineColors[path.line]} class="dimmed" />
    {/each}
    {#each networkPaths.filter(lit) as path}
      <path d={path.d} transform={path.transform} stroke={lineColors[path.line]} />
    {/each}
    {#if labelled?.labelAt}<text x={labelled.labelAt[0]} y={labelled.labelAt[1]} fill={lineColors[labelled.line]} font-size="44" font-weight="800">{segmentLabel}</text>{/if}
  </svg>
  {#if caption && selectedLine}<figcaption>{lineLabels[selectedLine]}<small>Schematic network</small></figcaption>{/if}
</figure>

<style>
  figure { margin: 20px 0 0; }
  svg { display: block; width: 100%; height: auto; aspect-ratio: 1020 / 980; }
  path { fill: none; stroke-width: var(--weight); vector-effect: non-scaling-stroke; stroke-linecap: round; stroke-linejoin: round; }
  path.dimmed { opacity: 0.18; stroke-width: 2; }
  .segment path.dimmed { opacity: 1; stroke-width: calc(var(--weight) * 0.9); }
  text { font-family: var(--font-display); letter-spacing: -0.01em; }
  figcaption { margin-top: 10px; font-size: 12px; font-weight: 650; }
  small { display: block; margin-top: 4px; font-size: 11px; color: #687267; font-weight: 400; }
</style>
