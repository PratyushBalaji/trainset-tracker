<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import FleetToolbar from '$lib/components/FleetToolbar.svelte';
  import CoverageNote from '$lib/components/CoverageNote.svelte';
  import GanttChart from '$lib/components/GanttChart.svelte';
  import ServiceChart from '$lib/components/ServiceChart.svelte';
  import TrainsetDetail from '$lib/components/TrainsetDetail.svelte';
  import { minIsoDate } from '$lib/data/date';
  import { buildTimelineSegments } from '$lib/data/lifecycle';
  import { getTrainsetTimelineBounds, timelineBounds } from '$lib/data/resolve';
  import { tracker } from '$lib/tracker-state.svelte';
  import type { DateBounds, DatedTrainset } from '$lib/data/types';

  let selectedId = $state<string | null>(null);
  let dragBounds = $state<DateBounds | null>(null);
  let origin: HTMLElement | null = null;

  afterNavigate(() => {
    const id = page.url.searchParams.get('trainset');
    if (id) { selectedId = id; void tick().then(() => document.getElementById(`chart-name-${id}`)?.scrollIntoView({ block: 'center', behavior: 'instant' })); }
  });
  onDestroy(() => tracker.stop());

  let dated = $derived(tracker.dated);
  let visible = $derived(dated.filter((t) => !tracker.hidden.has(t.id)));
  let plottedFleet = $derived(tracker.fleet.filter((t) => !tracker.hidden.has(t.id)));
  let dataBounds = $derived(getTrainsetTimelineBounds(plottedFleet, timelineBounds));
  let bounds = $derived(dragBounds ?? { start: dataBounds.start, end: minIsoDate(dataBounds.end, timelineBounds.end) });
  let segments = $derived(new Map(plottedFleet.map((t) => [t.id, buildTimelineSegments(t.milestones, bounds.start, bounds.end)])));
  let chartTrainsets = $derived(visible.map((t) => ({ ...t, timelineSegments: segments.get(t.id)! })));
  let hiddenTrains = $derived(dated.filter((t) => tracker.hidden.has(t.id)));
  let selected = $derived(selectedId ? (dated.find((t) => t.id === selectedId) ?? null) : null);
  let lastHidden = $derived(dated.find((t) => t.id === tracker.lastHiddenId));

  async function select(id: string, element?: HTMLElement) {
    tracker.stop();
    origin = element ?? null;
    selectedId = id;
    await tick();
    document.getElementById('trainset-detail')?.focus({ preventScroll: true });
  }
  async function clear() {
    const id = selectedId;
    selectedId = null;
    await tick();
    (origin?.isConnected ? origin : document.getElementById(`chart-name-${id}`))?.focus({ preventScroll: true });
    origin = null;
  }
</script>

<svelte:head>
  <title>Lifecycle | Namma Metro Trainset Tracker</title>
  <meta name="description" content="Dispatch, testing and passenger service for every tracked Namma Metro trainset on one chart." />
</svelte:head>
<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && selectedId) void clear(); }} />

<main class="lifecycle-page">
  <FleetToolbar title="Lifecycle" playFrom={dataBounds.start}>
    {#snippet summary()}From factory to passengers, one row per tracked train.{/snippet}
  </FleetToolbar>

  <div class="body">
    <CoverageNote date={tracker.selectedDate} />
    <ServiceChart trainsets={tracker.fleet} {bounds} selectedDate={tracker.selectedDate} />
    {#if hiddenTrains.length}
      <p class="hidden-note">{hiddenTrains.length} hidden: {hiddenTrains.map((t) => `${t.trainsetNumber} (${t.lineSummary})`).join(', ')} <button type="button" onclick={() => tracker.showAll()}>Show all</button></p>
    {/if}
    <GanttChart
      trainsets={chartTrainsets}
      selectedDate={tracker.selectedDate}
      {bounds}
      maxDate={timelineBounds.end}
      selectedId={selectedId}
      onSelect={select}
      onHideFromChart={(id) => tracker.toggleHidden(id)}
      onDateChange={(date) => tracker.setDate(date)}
      onDragBoundsChange={(b) => { dragBounds = b; }}
    />
  </div>

  {#if selected}
    <div class="drawer">
      <button type="button" class="scrim" aria-label="Close details" onclick={clear}></button>
      <TrainsetDetail trainset={selected as DatedTrainset} asOf={tracker.selectedDate} onClear={clear} />
    </div>
  {/if}

  <div class="undo" role="status" aria-live="polite">{#if lastHidden}{lastHidden.trainsetNumber} · {lastHidden.lineSummary} hidden <button type="button" onclick={() => tracker.toggleHidden(lastHidden!.id)}>Undo</button>{/if}</div>
</main>

<style>
  .body { max-width: 1400px; margin: 0 auto; padding: 24px 32px 64px; display: grid; gap: 18px; }
  .hidden-note { margin: 0; font-size: 13px; color: var(--muted); }
  .hidden-note button { margin-left: 8px; height: 30px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); font-size: 12px; }
  .drawer { position: fixed; inset: var(--site-header-height) 0 0 auto; z-index: 45; width: min(420px, 100%); display: flex; }
  .drawer :global(.detail-panel) { position: relative; width: 100%; max-height: none; height: 100%; overflow: auto; border-radius: 0; border-right: 0; border-bottom: 0; box-shadow: -12px 0 32px #17211d22; }
  .drawer :global(.detail-header) { top: 0; }
  .scrim { display: none; }
  .undo:empty { display: none; }
  .undo { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 40; display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 16px; border-radius: 10px; background: var(--ink); color: var(--surface); font-size: 13px; box-shadow: 0 8px 24px #17211d30; }
  .undo button { height: 32px; padding: 0 12px; border-radius: 6px; border: 0; background: var(--surface); color: var(--ink); font-weight: 600; }
  @media (max-width: 860px) {
    .body { padding: 18px 16px 48px; }
    .drawer { inset: 0; width: 100%; align-items: flex-end; }
    .scrim { display: block; position: fixed; inset: 0; border: 0; background: #17211d55; }
    .drawer :global(.detail-panel) { height: auto; max-height: 82svh; border-radius: 18px 18px 0 0; }
  }
</style>
