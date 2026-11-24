<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Pause, Play, X } from '@lucide/svelte';
  import { page } from '$app/state';
  import { replaceState } from '$app/navigation';
  import { lineOptions, manufacturerOptions, timelineBounds } from '$lib/data/resolve';
  import { lineColors, lineOrder, lineShortLabels, manufacturerShortLabels } from '$lib/data/presentation';
  import { dateSliderMax, tracker } from '$lib/tracker-state.svelte';
  import { daysBetween } from '$lib/data/date';

  // Without `playFrom` the page has no date controls and always shows today (Fleet); Lifecycle passes it.
  let { title, playFrom, summary }: { title: string; playFrom?: string; summary?: Snippet } = $props();

  const lines = [...lineOptions].sort((a, b) => lineOrder.indexOf(a) - lineOrder.indexOf(b));
  const years = (() => {
    const out: { label: string; left: number }[] = [];
    for (let y = Number(timelineBounds.start.slice(0, 4)) + 1; y <= Number(timelineBounds.end.slice(0, 4)); y++) {
      out.push({ label: String(y), left: (daysBetween(timelineBounds.start, `${y}-01-01`) / dateSliderMax) * 100 });
    }
    return out;
  })();
  let sliderValue = $derived(daysBetween(timelineBounds.start, tracker.selectedDate));
  let progress = $derived((sliderValue / dateSliderMax) * 100);
  const allLines = $derived(tracker.lines.size === lineOptions.length);
  const allMakers = $derived(tracker.manufacturers.size === manufacturerOptions.length);
  // Links like /lifecycle?maker=titagarh arrive with that filter already on.
  let appliedSearch = '';
  $effect(() => {
    const search = page.url.search;
    if (search === appliedSearch) return;
    appliedSearch = search;
    tracker.applyFromUrl(page.url.searchParams);
  });
  // Clearing also drops ?maker= / ?line= from the address, so a refresh doesn't switch the filter back on.
  function clearAll() {
    tracker.clearFilters();
    if (!page.url.searchParams.has('maker') && !page.url.searchParams.has('line')) return;
    const url = new URL(page.url);
    url.searchParams.delete('maker');
    url.searchParams.delete('line');
    replaceState(url, page.state);
  }
</script>

<div class="toolbar">
  <div class="toolbar-inner">
    <div class="toolbar-top">
      <div>
        <h1 class="page-heading">{title}</h1>
        {#if summary}<div class="summary">{@render summary()}</div>{/if}
      </div>
      {#if playFrom}
      <div class="date-control">
        <label for="status-date">Status on</label>
        <input id="status-date" class="tnum" type="date" value={tracker.selectedDate} min={timelineBounds.start} max={timelineBounds.end} onchange={(e) => { const v = e.currentTarget.value; if (v) tracker.setDate(v); }} />
        <button type="button" class="play" aria-label={tracker.playing ? 'Pause history playback' : 'Play history from the first record'} title={tracker.playing ? 'Pause' : 'Play history'} onclick={() => tracker.togglePlay(playFrom!)}>
          {#if tracker.playing}<Pause size={15} fill="currentColor" />{:else}<Play size={15} fill="currentColor" />{/if}
        </button>
        <button type="button" class="today" disabled={tracker.isToday} onclick={() => tracker.resetDate()}>Today</button>
      </div>
      {/if}
    </div>

    {#if playFrom}
    <div class="scrubber" style={`--progress: ${progress}%`}>
      <input type="range" min="0" max={dateSliderMax} value={sliderValue} aria-label="Status date" aria-valuetext={tracker.dateLabel} oninput={(e) => tracker.setDateFromOffset(Number(e.currentTarget.value))} />
      <div class="scale tnum" aria-hidden="true">
        {#each years as year}<span style={`left: ${year.left}%`}>{year.label}</span>{/each}
      </div>
    </div>
    {/if}

    {#if tracker.filtersActive}
      <div class="active-filter" role="status">
        <span>Showing only <strong>{tracker.filterLabel}</strong></span>
        <button type="button" onclick={clearAll}><X size={14} aria-hidden="true" />Clear filter</button>
      </div>
    {/if}
    <div class="filters" role="group" aria-label="Filter trains">
      <button type="button" class="chip" aria-pressed={allLines} onclick={() => tracker.pickLine(null)}>All lines</button>
      {#each lines as line}
        <button type="button" class="chip" aria-pressed={!allLines && tracker.lines.has(line)} onclick={() => tracker.pickLine(line)}><span class="dot" style={`--dot: ${lineColors[line]}`}></span>{lineShortLabels[line] ?? line}</button>
      {/each}
      <span class="divider" aria-hidden="true"></span>
      <button type="button" class="chip" aria-pressed={allMakers} onclick={() => tracker.pickManufacturer(null)}>All makers</button>
      {#each manufacturerOptions as maker}
        <button type="button" class="chip" aria-pressed={!allMakers && tracker.manufacturers.has(maker)} onclick={() => tracker.pickManufacturer(maker)}>{manufacturerShortLabels[maker] ?? maker}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .toolbar { position: sticky; top: var(--site-header-height); z-index: 12; background: var(--bg); border-bottom: 1px solid var(--border); }
  .toolbar-inner { max-width: 1400px; margin: 0 auto; padding: 22px 32px 14px; display: grid; gap: 14px; }
  .toolbar-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px 24px; flex-wrap: wrap; }
  .summary { margin-top: 6px; font-size: 14px; color: var(--ink-3); }
  .date-control { display: flex; align-items: center; gap: 8px; padding: 5px 5px 5px 14px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); }
  .date-control label { font-size: 12px; color: var(--muted); }
  .date-control input { border: 0; background: transparent; font-size: 14px; font-weight: 600; color: var(--ink); min-height: 34px; }
  .play { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); }
  .play:hover { border-color: var(--muted); }
  .today { height: 36px; padding: 0 14px; border-radius: 8px; border: 0; background: var(--ink); color: var(--surface); font-size: 13px; font-weight: 600; }
  .today:disabled { background: var(--hover); color: var(--muted); cursor: default; }
  .scrubber { position: relative; padding-bottom: 16px; }
  .scrubber input { width: 100%; margin: 0; height: 18px; appearance: none; background: transparent; cursor: pointer; }
  .scrubber input::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--ink) var(--progress), #dfe4db var(--progress)); }
  .scrubber input::-moz-range-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--ink) var(--progress), #dfe4db var(--progress)); }
  .scrubber input::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; margin-top: -6px; border-radius: 50%; background: var(--surface); border: 3px solid var(--ink); }
  .scrubber input::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%; background: var(--surface); border: 3px solid var(--ink); }
  .scale { position: absolute; left: 8px; right: 8px; bottom: 0; height: 14px; font-size: 11px; color: var(--muted); }
  .scale span { position: absolute; transform: translateX(-50%); }
  .filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .active-filter { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 8px 8px 14px; border-radius: 10px; background: #f2b84b2e; border: 1px solid #e6a23c80; font-size: 14px; color: var(--ink-2); }
  .active-filter strong { color: var(--ink); }
  .active-filter button { display: inline-flex; align-items: center; gap: 6px; flex: none; height: 32px; padding: 0 12px; border-radius: 8px; border: 0; background: var(--ink); color: var(--surface); font-size: 13px; font-weight: 600; cursor: pointer; }
  .divider { width: 1px; height: 22px; background: var(--border); margin: 0 4px; }
  @media (max-width: 860px) {
    .toolbar { position: static; }
    .toolbar-inner { padding: 18px 16px 12px; }
    .date-control { width: 100%; }
    .date-control input { flex: 1; min-width: 0; }
    .play, .today { height: 40px; } .play { width: 44px; }
    .filters { flex-wrap: nowrap; overflow-x: auto; margin: 0 -16px; padding: 0 16px 2px; scrollbar-width: none; }
    .chip { height: 38px; }
  }
</style>
