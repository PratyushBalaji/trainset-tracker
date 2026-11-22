<script lang="ts">
  import { ExternalLink } from '@lucide/svelte';
  let { sources, label = 'Sources' }: { sources: string[]; label?: string } = $props();
  function hostname(source: string) {
    try { return new URL(source).hostname.replace(/^www\./, ''); } catch { return source; }
  }
</script>

{#if sources.length}
  <div class="source-links" aria-label={label}>
    {#each Array.from(new Set(sources)) as source, index}
      <a href={source} target="_blank" rel="noreferrer" aria-label={`${label}: ${hostname(source)}, reference ${index + 1}, opens in new tab`} title={source}>{hostname(source)}<ExternalLink size={12} aria-hidden="true" /></a>
    {/each}
  </div>
{/if}

<style>
  .source-links { display: flex; flex-wrap: wrap; gap: 6px; }
  a { display: inline-flex; align-items: center; gap: 5px; max-width: 100%; min-height: 32px; padding: 6px 9px; border: 1px solid #d8ded4; border-radius: 8px; background: #fffdfa; color: #445048; font-size: 12px; text-decoration: none; overflow-wrap: anywhere; }
  a:hover { color: #0b5fe8; border-color: #99b6df; }
  a :global(svg) { flex-shrink: 0; }
</style>
