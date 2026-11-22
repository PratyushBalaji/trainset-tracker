<script lang="ts">
  import { networkPaths, networkViewBox } from '$lib/data/network-map';
  import { lineColors, lineLabels } from '$lib/data/presentation';

  // With no selectedLine every line is drawn in its colour (Home); otherwise others are dimmed.
  let { selectedLine = null, caption = true, weight = 3.5 }: { selectedLine?: string | null; caption?: boolean; weight?: number } = $props();
  let label = $derived(selectedLine ? `Namma Metro schematic network, ${lineLabels[selectedLine]} highlighted` : 'Namma Metro schematic network');
</script>

<figure style={`--weight: ${weight}`}>
  <svg viewBox={networkViewBox} role="img" aria-label={label}>
    <title>{selectedLine ? `${lineLabels[selectedLine]} in the Namma Metro network` : 'Namma Metro network'}</title>
    {#each networkPaths.filter((path) => selectedLine && path.line !== selectedLine) as path}
      <path d={path.d} transform={path.transform} stroke={lineColors[path.line]} class="dimmed" />
    {/each}
    {#each networkPaths.filter((path) => !selectedLine || path.line === selectedLine) as path}
      <path d={path.d} transform={path.transform} stroke={lineColors[path.line]} />
    {/each}
  </svg>
  {#if caption && selectedLine}<figcaption>{lineLabels[selectedLine]}<small>Schematic network</small></figcaption>{/if}
</figure>

<style>
  figure { margin: 20px 0 0; }
  svg { display: block; width: 100%; height: auto; aspect-ratio: 1020 / 980; }
  path { fill: none; stroke-width: var(--weight); vector-effect: non-scaling-stroke; stroke-linecap: round; stroke-linejoin: round; }
  path.dimmed { opacity: 0.18; stroke-width: 2; }
  figcaption { margin-top: 10px; font-size: 12px; font-weight: 650; }
  small { display: block; margin-top: 4px; font-size: 11px; color: #687267; font-weight: 400; }
</style>
