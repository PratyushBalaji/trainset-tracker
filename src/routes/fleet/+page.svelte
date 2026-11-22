<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import FleetToolbar from '$lib/components/FleetToolbar.svelte';
  import CoverageNote from '$lib/components/CoverageNote.svelte';
  import TrainsetCard from '$lib/components/TrainsetCard.svelte';
  import TrainsetDetail from '$lib/components/TrainsetDetail.svelte';
  import { lineColors, lineLabels, lineOrder } from '$lib/data/presentation';
  import { getTrainsetTimelineBounds, timelineBounds } from '$lib/data/resolve';
  import { tracker } from '$lib/tracker-state.svelte';
  import type { DatedTrainset } from '$lib/data/types';

  let selectedId = $state<string | null>(null);
  let mobile = $state(false);
  let origin: HTMLElement | null = null;

  afterNavigate(() => {
    const id = page.url.searchParams.get('trainset');
    if (id) void select(id);
  });
  onMount(() => {
    const query = matchMedia('(max-width: 860px)');
    const update = () => { mobile = query.matches; };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  onDestroy(() => tracker.stop());

  const playFrom = getTrainsetTimelineBounds(tracker.fleet, timelineBounds).start;
  let dated = $derived(tracker.dated);
  let counts = $derived(dated.reduce((acc, t) => { acc[t.currentStage.id] = (acc[t.currentStage.id] ?? 0) + 1; return acc; }, {} as Record<string, number>));
  let groups = $derived(lineOrder.concat([...new Set(dated.map((t) => t.displayLine))].filter((l) => !lineOrder.includes(l)))
    .map((line) => {
      const trains = dated.filter((t) => t.displayLine === line);
      const stage = (id: string) => trains.filter((t) => t.currentStage.id === id).length;
      const families = [...new Set(trains.map((t) => `${t.contractId.replace('bmrcl-', '').toUpperCase()} ${t.rollingStock.signalling}`))];
      const summary = [stage('service') && `${stage('service')} in service`, stage('testing') && `${stage('testing')} testing`, stage('dispatch') && `${stage('dispatch')} in transit`].filter(Boolean).join(' · ') || 'Not yet delivered';
      return { line, trains, families: families.join(' · '), summary };
    })
    .filter((group) => group.trains.length));
  let selected = $derived(selectedId ? (dated.find((t) => t.id === selectedId) ?? null) : null);
  let lastHidden = $derived(dated.find((t) => t.id === tracker.lastHiddenId));

  async function select(id: string, element?: HTMLElement) {
    origin = element ?? null;
    selectedId = id;
    await tick();
    const panel = document.getElementById('trainset-detail');
    if (!element) document.getElementById(`card-${id}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
    panel?.focus({ preventScroll: true });
  }
  async function clear() {
    const id = selectedId;
    selectedId = null;
    await tick();
    (origin?.isConnected ? origin : document.getElementById(`card-select-${id}`))?.focus({ preventScroll: true });
    origin = null;
  }
</script>

<svelte:head>
  <title>Fleet | Namma Metro Trainset Tracker</title>
  <meta name="description" content="Status of every tracked Namma Metro trainset on any date, with the sources behind each milestone." />
</svelte:head>
<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && selectedId && mobile) void clear(); }} />

<main class="fleet-page">
  <FleetToolbar title="Fleet" {playFrom}>
    {#snippet summary()}
      <span class="tnum"><strong class="svc">{counts.service ?? 0}</strong> in service · <strong class="tst">{counts.testing ?? 0}</strong> testing{#if counts.dispatch} · <strong class="dsp">{counts.dispatch}</strong> in transit{/if} · {dated.length} tracked · {tracker.dateLabel}</span>
    {/snippet}
  </FleetToolbar>

  <div class="fleet-body" class:with-detail={!!selected && !mobile}>
    <div class="groups">
      <CoverageNote date={tracker.selectedDate} />
      {#each groups as group (group.line)}
        <section class="group" aria-labelledby={`group-${group.line}`} style={`--line-color: ${lineColors[group.line] ?? '#6f786f'}`}>
          <header>
            <h2 id={`group-${group.line}`}>{lineLabels[group.line] ?? group.line}</h2>
            <span class="families">{group.families}</span>
            <span class="group-summary tnum">{group.summary}</span>
          </header>
          <div class="grid">
            {#each group.trains as trainset (trainset.id)}
              <TrainsetCard {trainset} selected={selectedId === trainset.id} hiddenFromChart={tracker.hidden.has(trainset.id)} onSelect={(id, el) => select(id, el)} onToggleChartVisibility={(id) => tracker.toggleHidden(id)} />
            {/each}
          </div>
        </section>
      {:else}
        <div class="empty">No trainsets match these filters. <button type="button" onclick={() => tracker.clearFilters()}>Clear filters</button></div>
      {/each}
    </div>

    {#if selected}
      <div class="detail-wrap" class:sheet={mobile}>
        {#if mobile}<button type="button" class="scrim" aria-label="Close details" onclick={clear}></button>{/if}
        <TrainsetDetail trainset={selected as DatedTrainset} asOf={tracker.selectedDate} chartHref={`/lifecycle?trainset=${selected.id}`} onClear={clear} />
      </div>
    {/if}
  </div>

  <div class="undo" role="status" aria-live="polite">{#if lastHidden}{lastHidden.trainsetNumber} · {lastHidden.lineSummary} hidden from the lifecycle chart <button type="button" onclick={() => tracker.toggleHidden(lastHidden!.id)}>Undo</button>{/if}</div>
</main>

<style>
  strong.svc { color: var(--service-ink); }
  strong.tst { color: var(--testing-ink); }
  strong.dsp { color: var(--dispatch-ink); }
  .fleet-body { max-width: 1400px; margin: 0 auto; padding: 24px 32px 64px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 28px; align-items: start; }
  .fleet-body.with-detail { grid-template-columns: minmax(0, 1fr) 380px; }
  .groups { display: flex; flex-direction: column; gap: 34px; min-width: 0; }
  .group header { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; padding-bottom: 10px; margin-bottom: 14px; border-bottom: 3px solid var(--line-color); }
  .group h2 { margin: 0; font-size: 19px; font-weight: 700; }
  .families { font-size: 13px; color: var(--muted); }
  .group-summary { margin-left: auto; font-size: 13px; color: var(--ink-3); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 10px; }
  .detail-wrap { position: sticky; top: calc(var(--site-header-height) + 200px); max-height: calc(100svh - var(--site-header-height) - 220px); display: flex; }
  .detail-wrap :global(.detail-panel) { width: 100%; }
  .empty { padding: 40px; text-align: center; border: 1px dashed var(--border); border-radius: var(--radius-lg); color: var(--muted); }
  .empty button { margin-left: 8px; }
  .undo:empty { display: none; }
  .undo { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 40; display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 16px; border-radius: 10px; background: var(--ink); color: var(--surface); font-size: 13px; box-shadow: 0 8px 24px #17211d30; }
  .undo button { height: 32px; padding: 0 12px; border-radius: 6px; border: 0; background: var(--surface); color: var(--ink); font-weight: 600; }
  @media (max-width: 860px) {
    .fleet-body { padding: 18px 16px 48px; }
    .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .group-summary { margin-left: 0; width: 100%; }
    .detail-wrap.sheet { position: fixed; inset: 0; top: auto; z-index: 50; max-height: none; display: block; }
    .scrim { position: fixed; inset: 0; border: 0; background: #17211d55; }
    .sheet :global(.detail-header) { top: 0; }
    .sheet :global(.detail-panel) { position: relative; max-height: 82svh; overflow: auto; border-radius: 18px 18px 0 0; box-shadow: 0 -8px 30px #17211d30; }
  }
</style>
