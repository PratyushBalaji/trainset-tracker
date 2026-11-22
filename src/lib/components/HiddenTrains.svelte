<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import { lineColors, lineLabels, lineOrder } from '$lib/data/presentation';
  import type { ResolvedTrainset } from '$lib/data/types';

  let { trains, onRestore, onRestoreAll }: { trains: ResolvedTrainset[]; onRestore: (id: string) => void; onRestoreAll: () => void } = $props();

  let byLine = $derived(lineOrder
    .concat([...new Set(trains.map((t) => t.displayLine))].filter((l) => !lineOrder.includes(l)))
    .map((line) => ({ line, trains: trains.filter((t) => t.displayLine === line) }))
    .filter((g) => g.trains.length));
</script>

{#if trains.length}
  <div class="hidden-trains">
    <details>
      <summary><span class="tnum">{trains.length} hidden</span><ChevronDown size={15} class="chev" /></summary>
      <ul>
        {#each byLine as group (group.line)}
          <li>
            <span class="line"><span class="dot" style={`--dot: ${lineColors[group.line] ?? '#6f786f'}`}></span>{lineLabels[group.line] ?? group.line}:</span>
            {#each group.trains as t, i (t.id)}<button type="button" class="restore tnum" title={`Show ${t.trainsetNumber} on the chart again`} onclick={() => onRestore(t.id)}>{t.trainsetNumber}</button>{#if i < group.trains.length - 1}<span class="comma">,</span>{/if}{/each}
          </li>
        {/each}
      </ul>
    </details>
    <button type="button" class="show-all" onclick={onRestoreAll}>Show all</button>
  </div>
{/if}

<style>
  .hidden-trains { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  details { position: relative; }
  summary { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 8px 0 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 600; color: var(--ink-2); list-style: none; cursor: pointer; }
  summary::-webkit-details-marker { display: none; }
  summary:hover { border-color: var(--muted); }
  details :global(.chev) { color: var(--muted); transition: transform 150ms ease; }
  details[open] :global(.chev) { transform: rotate(180deg); }
  ul { position: absolute; z-index: 20; top: calc(100% + 6px); left: 0; min-width: 260px; max-width: min(420px, 80vw); list-style: none; margin: 0; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); box-shadow: 0 8px 24px #17211d1f; font-size: 13px; }
  li { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 4px; }
  .line { display: inline-flex; align-items: center; gap: 6px; margin-right: 4px; color: var(--ink-3); }
  .restore { padding: 2px 2px; border: 0; background: none; font-size: 13px; font-weight: 600; color: var(--ink); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--faint); }
  .restore:hover { color: #0b5fe8; text-decoration-color: currentColor; }
  .comma { color: var(--muted); margin-right: 2px; }
  .show-all { height: 30px; padding: 0 12px; border-radius: 6px; border: 0; background: var(--ink); color: var(--surface); font-size: 12px; font-weight: 600; }
</style>
