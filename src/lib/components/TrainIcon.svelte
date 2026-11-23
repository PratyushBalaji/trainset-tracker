<script lang="ts">
  import { trainDesignLabels, type TrainDesign } from '$lib/data/presentation';

  let { design, variant = 'small', size = 20, label, color }: {
    design: TrainDesign; variant?: 'outline' | 'solid' | 'small'; size?: number; label?: string; color?: string;
  } = $props();
  let href = $derived(`/icons/trains/${design}-${variant}.svg#train`);
</script>

<span
  class="train-icon"
  style={`width: ${size}px; height: ${size}px;${color ? ` color: ${color};` : ''}`}
  role={label ? 'img' : undefined}
  aria-label={label ? (label === trainDesignLabels[design] ? label : `${label} (${trainDesignLabels[design]})`) : undefined}
  aria-hidden={label ? undefined : 'true'}
  title={trainDesignLabels[design]}
><svg aria-hidden="true" focusable="false"><use {href} width="100%" height="100%" /></svg></span>

<style>
  .train-icon { display: inline-block; flex: none; line-height: 0; }
  .train-icon :global(svg) { width: 100%; height: 100%; display: block; }
</style>
