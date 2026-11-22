<script lang="ts">
  import { Info } from '@lucide/svelte';
  import { pendingOn, trackedContractsLabel, untrackedFleet } from '$lib/data/coverage';
  import { resolvedTrainsets } from '$lib/data/resolve';

  let { date }: { date: string } = $props();
  let pending = $derived(pendingOn(date));
</script>

<p class="coverage"><Info size={15} aria-hidden="true" />
  <span>Tracking the <strong>{trackedContractsLabel}</strong> contracts: {resolvedTrainsets.length} trains on record{#if pending}, <strong class="tnum">{pending}</strong> more ordered but not yet delivered{/if}. The <strong class="tnum">{untrackedFleet.trainsets}</strong> {untrackedFleet.label} ({untrackedFleet.contracts}) are not tracked here.</span>
</p>

<style>
  .coverage { display: flex; gap: 10px; align-items: flex-start; margin: 0; padding: 12px 14px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border-soft); font-size: 13px; line-height: 1.5; color: var(--ink-3); }
  .coverage :global(svg) { flex: none; margin-top: 2px; color: var(--muted); }
  strong { color: var(--ink); font-weight: 600; }
</style>
