<script lang="ts">
  import { indiaOutline } from '$lib/data/india-outline';

  let { from, to, label, size = 64 }: { from: string; to: string; label: string; size?: number } = $props();
  let a = $derived(indiaOutline.places[from]);
  let b = $derived(indiaOutline.places[to]);
  // A gentle arc bowing inland (west), so the route stays over land like the road does, not over the sea.
  let mid = $derived(a && b ? [(a[0] + b[0]) / 2 - Math.abs(a[1] - b[1]) * 0.55, (a[1] + b[1]) / 2 - Math.abs(a[0] - b[0]) * 0.15] : [0, 0]);
</script>

{#if a && b}
  <svg class="india-route" viewBox={indiaOutline.viewBox} width={size || undefined} role="img" aria-label={label}>
    <title>{label}</title>
    <path class="land" d={indiaOutline.d} />
    <path class="route" d={`M ${a[0]} ${a[1]} Q ${mid[0]} ${mid[1]} ${b[0]} ${b[1]}`} />
    <circle class="end" cx={a[0]} cy={a[1]} r="3" />
    <circle class="end to" cx={b[0]} cy={b[1]} r="3" />
  </svg>
{/if}

<style>
  .india-route { display: block; flex: none; height: auto; overflow: visible; }
  .land { fill: var(--soft, #e9ede5); stroke: var(--on-3, #8a928a); stroke-width: 0.7; stroke-linejoin: round; }
  .route { fill: none; stroke: var(--slow, #c8553d); stroke-width: 2; stroke-dasharray: 3 2.6; stroke-linecap: round; }
  .end { fill: var(--on, #17211d); }
  .end.to { fill: var(--fast, #2a9d8f); }
</style>
