<script lang="ts" module>
  // Traced from the owner's drawings (static/icons/trains). Inlined so they take currentColor.
  const files = import.meta.glob('../../../static/icons/trains/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const icons: Record<string, string> = {};
  for (const [path, svg] of Object.entries(files)) {
    const name = path.split('/').pop()!.replace('.svg', '');
    // Decorative by default: the surrounding text names the train.
    icons[name] = svg.replace(/<title>.*?<\/title>/, '').replace('role="img"', 'aria-hidden="true" focusable="false"');
  }
</script>

<script lang="ts">
  import { trainDesignLabels, type TrainDesign } from '$lib/data/presentation';

  let { design, variant = 'small', size = 20, label, color }: {
    design: TrainDesign; variant?: 'outline' | 'solid' | 'small'; size?: number; label?: string; color?: string;
  } = $props();
  let svg = $derived(icons[`${design}-${variant}`] ?? '');
</script>

<span
  class="train-icon"
  style={`width: ${size}px; height: ${size}px;${color ? ` color: ${color};` : ''}`}
  role={label ? 'img' : undefined}
  aria-label={label ? (label === trainDesignLabels[design] ? label : `${label} (${trainDesignLabels[design]})`) : undefined}
  aria-hidden={label ? undefined : 'true'}
  title={trainDesignLabels[design]}
>{@html svg}</span>

<style>
  .train-icon { display: inline-block; flex: none; line-height: 0; }
  .train-icon :global(svg) { width: 100%; height: 100%; display: block; }
</style>
