<script lang="ts">
  import { onDestroy } from 'svelte';
  import { CalendarDays, ChevronDown, Eye, Filter, Minus, PanelLeftClose, PanelLeftOpen, Pause, Play, RotateCcw } from '@lucide/svelte';
  import GanttChart from '$lib/components/GanttChart.svelte';
  import TrainsetCard from '$lib/components/TrainsetCard.svelte';
  import TrainsetDetail from '$lib/components/TrainsetDetail.svelte';
  import {
    addDays,
    clampIsoDate,
    compareIsoDate,
    daysBetween,
    formatDate,
    maxIsoDate,
    minIsoDate,
    todayIsoDate
  } from '$lib/data/date';
  import { buildTimelineSegments } from '$lib/data/lifecycle';
  import {
    decorateTrainsetForDate,
    getTrainsetTimelineBounds,
    lineLabels,
    lineOptions,
    manufacturerOptions,
    resolvedTrainsets,
    stageDefinitions,
    timelineBounds
  } from '$lib/data/resolve';
  import type { DatedTrainset, LineId, StageId } from '$lib/data/types';

  const today = clampIsoDate(todayIsoDate(), timelineBounds.start, timelineBounds.end);
  const dateSliderMax = daysBetween(timelineBounds.start, timelineBounds.end);
  const playbackStepDays = 1;
  const playbackIntervalMs = 35;
  const initiallyHiddenChartTrainsetIds = new Set(
    resolvedTrainsets
      .filter((trainset) => trainset.timelineSegments.length === 0)
      .map((trainset) => trainset.id)
  );

  let selectedDate = $state(today);
  let selectedStages = $state(new Set<StageId>(stageDefinitions.map((stage) => stage.id)));
  let selectedManufacturers = $state(new Set<string>(manufacturerOptions));
  let selectedLines = $state(new Set<LineId>(lineOptions));
  let selectedTrainsetId = $state<string | null>(null);
  let filtersCollapsed = $state(false);
  let hiddenChartTrainsetIds = $state(new Set(initiallyHiddenChartTrainsetIds));
  let isPlaybackActive = $state(false);
  let playbackEndDate = $state<string | null>(null);
  let playbackTimer: ReturnType<typeof setInterval> | null = null;

  function toggleValue<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }

    return next;
  }

  function resetDate() {
    stopPlayback();
    selectedDate = today;
  }

  function setDateFromSlider(event: Event) {
    stopPlayback();
    const value = Number((event.currentTarget as HTMLInputElement).value);
    selectedDate = addDays(timelineBounds.start, value);
  }

  function setDateFromInput(event: Event) {
    stopPlayback();
    const value = (event.currentTarget as HTMLInputElement).value;
    if (value) {
      selectedDate = clampIsoDate(value, timelineBounds.start, timelineBounds.end);
    }
  }

  function selectTrainset(id: string) {
    selectedTrainsetId = id;
  }

  function clearSelection() {
    selectedTrainsetId = null;
  }

  function toggleTrainsetChartVisibility(id: string) {
    const next = new Set(hiddenChartTrainsetIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    hiddenChartTrainsetIds = next;
  }

  function showAllChartTrainsets() {
    hiddenChartTrainsetIds = new Set();
  }

  function stopPlayback() {
    if (playbackTimer) {
      clearInterval(playbackTimer);
      playbackTimer = null;
    }

    playbackEndDate = null;
    isPlaybackActive = false;
  }

  function advancePlayback() {
    const targetDate = playbackEndDate ?? timelineBounds.end;
    const nextDate = clampIsoDate(
      addDays(selectedDate, playbackStepDays),
      timelineBounds.start,
      targetDate
    );

    selectedDate = nextDate;

    if (compareIsoDate(nextDate, targetDate) >= 0) {
      stopPlayback();
    }
  }

  function startPlayback() {
    stopPlayback();
    playbackEndDate = timelineBounds.end;
    selectedDate = clampIsoDate(
      selectedDate === today ? chartDataTimelineBounds.start : selectedDate,
      timelineBounds.start,
      timelineBounds.end
    );
    isPlaybackActive = true;
    playbackTimer = setInterval(advancePlayback, playbackIntervalMs);
  }

  function togglePlayback() {
    if (isPlaybackActive) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function setDateFromChart(date: string) {
    stopPlayback();
    selectedDate = clampIsoDate(date, timelineBounds.start, timelineBounds.end);
  }

  function countBy<T>(items: T[]): Map<T, number> {
    return items.reduce((counts, item) => counts.set(item, (counts.get(item) ?? 0) + 1), new Map<T, number>());
  }

  let datedTrainsets = $derived(
    resolvedTrainsets.map((trainset) => decorateTrainsetForDate(trainset, selectedDate))
  );
  let stageCounts = $derived(countBy(datedTrainsets.map((trainset) => trainset.currentStage.id)));
  let manufacturerCounts = $derived(countBy(datedTrainsets.map((trainset) => trainset.manufacturer)));
  let lineCounts = $derived(countBy(datedTrainsets.flatMap((trainset) => trainset.lineKeys)));
  let dateSliderValue = $derived(daysBetween(timelineBounds.start, selectedDate));
  let filteredTrainsets = $derived(datedTrainsets.filter(
    (trainset) =>
      selectedStages.has(trainset.currentStage.id) &&
      selectedManufacturers.has(trainset.manufacturer) &&
      trainset.lineKeys.some((line) => selectedLines.has(line))
  ));
  let visibleCardTrainsets = $derived(
    filteredTrainsets.filter((trainset) => !hiddenChartTrainsetIds.has(trainset.id))
  );
  let hiddenCardTrainsets = $derived(
    filteredTrainsets.filter((trainset) => hiddenChartTrainsetIds.has(trainset.id))
  );
  let chartBaseTrainsets = $derived(
    filteredTrainsets.filter((trainset) => !hiddenChartTrainsetIds.has(trainset.id))
  );
  let chartDataTimelineBounds = $derived(getTrainsetTimelineBounds(chartBaseTrainsets, timelineBounds));
  let chartTimelineBounds = $derived({
    start: minIsoDate(chartDataTimelineBounds.start, selectedDate, playbackEndDate ?? selectedDate),
    end: minIsoDate(
      maxIsoDate(chartDataTimelineBounds.end, selectedDate, playbackEndDate ?? selectedDate),
      timelineBounds.end
    )
  });
  let chartSelectedDate = $derived(clampIsoDate(selectedDate, chartTimelineBounds.start, chartTimelineBounds.end));
  let chartTrainsets = $derived(
    chartBaseTrainsets.map((trainset) => ({
      ...trainset,
      timelineSegments: buildTimelineSegments(
        trainset.milestones,
        chartTimelineBounds.start,
        chartTimelineBounds.end
      )
    }))
  );
  let selectedDateReadout = $derived(`${formatDate(selectedDate)}${selectedDate === today ? ' (Today)' : ''}`);
  let selectedTrainset = $derived(
    selectedTrainsetId
      ? (filteredTrainsets.find((trainset) => trainset.id === selectedTrainsetId) ?? null)
      : null
  );

  onDestroy(stopPlayback);
</script>

<svelte:head>
  <title>Namma Metro Trainset Tracker</title>
  <meta
    name="description"
    content="Track Namma Metro trainset dispatch, depot arrival, testing and passenger-service milestones."
  />
</svelte:head>

<main class="tracker-page">
  <header class="project-header">
    <div>
      <p>Metro Central pilot</p>
      <h1>Namma Metro Trainset Tracker</h1>
    </div>
    <a class="schema-chip" href="https://github.com/PratyushBalaji/trainset-tracker/blob/main/trainsets.json" target="_blank" rel="noreferrer">JSON schema {timelineBounds.start.slice(0, 4)}-{timelineBounds.end.slice(0, 4)}</a>
  </header>

  <section class:filters-collapsed={filtersCollapsed} class="workspace" aria-label="Trainset tracker controls and cards">
    <aside class:collapsed={filtersCollapsed} class="filters" aria-label="Filters">
      <div class="filter-heading">
        <div>
          <Filter size={17} />
          <span>Filters</span>
        </div>

        <button
          class="collapse-button"
          type="button"
          aria-label={filtersCollapsed ? 'Expand filters' : 'Collapse filters'}
          title={filtersCollapsed ? 'Expand filters' : 'Collapse filters'}
          onclick={() => (filtersCollapsed = !filtersCollapsed)}
        >
          {#if filtersCollapsed}
            <PanelLeftOpen size={16} />
          {:else}
            <PanelLeftClose size={16} />
          {/if}
        </button>
      </div>

      {#if !filtersCollapsed}
        <div class="filter-content">
          <div class="filter-group date-group">
            <label class="date-label" for="selected-date-slider">
              <CalendarDays size={16} />
              Date cursor
            </label>

            <div class="date-slider-row">
              <button
                class:playing={isPlaybackActive}
                class="playback-button"
                type="button"
                aria-label={isPlaybackActive ? 'Pause playback' : 'Play timeline'}
                title={isPlaybackActive ? 'Pause playback' : 'Play timeline'}
                onclick={togglePlayback}
              >
                {#if isPlaybackActive}
                  <Pause size={15} fill="currentColor" />
                {:else}
                  <Play size={15} fill="currentColor" />
                {/if}
              </button>

              <div class="date-slider-stack">
                <div class="date-scale" aria-hidden="true">
                  <span>{timelineBounds.start}</span>
                  <span>{timelineBounds.end}</span>
                </div>

                <input
                  id="selected-date-slider"
                  class="date-slider"
                  type="range"
                  min="0"
                  max={dateSliderMax}
                  value={dateSliderValue}
                  aria-label="Selected date"
                  oninput={setDateFromSlider}
                />
              </div>
            </div>

            <div class="date-controls">
              <input
                id="selected-date"
                type="date"
                value={selectedDate}
                min={timelineBounds.start}
                max={timelineBounds.end}
                onchange={setDateFromInput}
              />
              <button class="reset-button" type="button" onclick={resetDate}>
                <RotateCcw size={15} />
                Today
              </button>
            </div>

            <p class="date-readout">{selectedDateReadout}</p>
          </div>

          <details class="filter-group filter-accordion">
            <summary>
              <ChevronDown size={15} />
              <span>Stage<small>{selectedStages.size === stageDefinitions.length ? 'All selected' : `${selectedStages.size} of ${stageDefinitions.length} selected`}</small></span>
            </summary>
            <div class="filter-options">
            {#each stageDefinitions as stage}
              <label class:muted={(stageCounts.get(stage.id) ?? 0) === 0}>
                <input
                  type="checkbox"
                  checked={selectedStages.has(stage.id)}
                  onchange={() => (selectedStages = toggleValue(selectedStages, stage.id))}
                />
                <span>{stage.filterLabel}</span>
                <em>{stageCounts.get(stage.id) ?? 0}</em>
              </label>
            {/each}
            </div>
          </details>

          <details class="filter-group filter-accordion">
            <summary>
              <ChevronDown size={15} />
              <span>Manufacturer<small>{selectedManufacturers.size === manufacturerOptions.length ? 'All selected' : `${selectedManufacturers.size} of ${manufacturerOptions.length} selected`}</small></span>
            </summary>
            <div class="filter-options">
            {#each manufacturerOptions as manufacturer}
              <label>
                <input
                  type="checkbox"
                  checked={selectedManufacturers.has(manufacturer)}
                  onchange={() =>
                    (selectedManufacturers = toggleValue(selectedManufacturers, manufacturer))}
                />
                <span>{manufacturer}</span>
                <em>{manufacturerCounts.get(manufacturer) ?? 0}</em>
              </label>
            {/each}
            </div>
          </details>

          <details class="filter-group filter-accordion">
            <summary>
              <ChevronDown size={15} />
              <span>Metro line<small>{selectedLines.size === lineOptions.length ? 'All selected' : `${selectedLines.size} of ${lineOptions.length} selected`}</small></span>
            </summary>
            <div class="filter-options">
            {#each lineOptions as line}
              <label>
                <input
                  type="checkbox"
                  checked={selectedLines.has(line)}
                  onchange={() => (selectedLines = toggleValue(selectedLines, line))}
                />
                <span>{lineLabels[line] ?? line}</span>
                <em>{lineCounts.get(line) ?? 0}</em>
              </label>
            {/each}
            </div>
          </details>
        </div>
      {/if}
    </aside>

    <section class="cards-area" aria-label="Trainsets">
      <div class="cards-summary">
        <div>
          <p>{filteredTrainsets.length} of {datedTrainsets.length} trainsets</p>
          <h2>Fleet status at {selectedDateReadout}</h2>
        </div>

      </div>

      <div class:with-detail={Boolean(selectedTrainset)} class="cards-and-detail">
        <div class="cards-stack">
          {#if hiddenCardTrainsets.length > 0}
            <details class="hidden-card-section">
              <summary class="hidden-card-heading">
                <ChevronDown size={15} class="hidden-expand-icon" />
                <Minus size={15} class="hidden-collapse-icon" />
                <h3>Hidden from chart</h3>
                <span class="hidden-expand-label">Show {hiddenCardTrainsets.length} hidden</span>
                <span class="hidden-collapse-label">{hiddenCardTrainsets.length} hidden</span>
              </summary>
              <div class="hidden-actions">
                <button class="show-hidden-button" type="button" onclick={showAllChartTrainsets}>
                  <Eye size={15} /> Restore all to chart
                </button>
              </div>
              <div class="cards-grid hidden-cards-grid">
                {#each hiddenCardTrainsets as trainset}
                  <TrainsetCard
                    {trainset}
                    hiddenFromChart={true}
                    compact={Boolean(selectedTrainset)}
                    selected={selectedTrainset?.id === trainset.id}
                    onSelect={selectTrainset}
                    onToggleChartVisibility={toggleTrainsetChartVisibility}
                  />
                {/each}
              </div>
            </details>
          {/if}
          <div class="cards-grid">
            {#if filteredTrainsets.length === 0}
              <div class="empty-state">No trainsets match the current filters.</div>
            {:else if visibleCardTrainsets.length === 0}
              <div class="empty-state">All matching trainsets are hidden from the chart.</div>
            {:else}
              {#each visibleCardTrainsets as trainset}
                <TrainsetCard
                  {trainset}
                  hiddenFromChart={false}
                  compact={Boolean(selectedTrainset)}
                  selected={selectedTrainset?.id === trainset.id}
                  onSelect={selectTrainset}
                  onToggleChartVisibility={toggleTrainsetChartVisibility}
                />
              {/each}
            {/if}
          </div>

        </div>

        {#if selectedTrainset}
          <TrainsetDetail trainset={selectedTrainset as DatedTrainset} onClear={clearSelection} />
        {/if}
      </div>
    </section>
  </section>

  <GanttChart
    trainsets={chartTrainsets}
    selectedDate={chartSelectedDate}
    bounds={chartTimelineBounds}
    maxDate={timelineBounds.end}
    selectedId={selectedTrainset?.id ?? null}
    onSelect={selectTrainset}
    onHideFromChart={toggleTrainsetChartVisibility}
    onDateChange={setDateFromChart}
  />
</main>

<style>
  .tracker-page {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto auto auto;
    align-content: start;
  }

  .project-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 14px;
    padding: 16px clamp(14px, 3vw, 32px) 12px;
  }

  .project-header p,
  .project-header h1,
  .cards-summary p,
  .cards-summary h2 {
    margin: 0;
  }

  .project-header p,
  .cards-summary p {
    color: #687267;
    font-size: 0.76rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .project-header h1 {
    margin-top: 4px;
    font-size: clamp(1.45rem, 2.6vw, 2.45rem);
    line-height: 1;
  }

  .schema-chip {
    text-decoration: none;
    flex: 0 0 auto;
    padding: 7px 9px;
    border: 1px solid #d8ded4;
    border-radius: 999px;
    background: #fffdfa;
    color: #536055;
    font-size: 0.78rem;
    font-weight: 720;
  }

  .schema-chip:hover,
  .schema-chip:focus-visible {
    color: #0b5fe8;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .workspace {
    height: clamp(320px, 60vh, 640px);
    display: grid;
    grid-template-columns: minmax(222px, 268px) minmax(0, 1fr);
    gap: 16px;
    min-height: 0;
    overflow: hidden;
    padding: 0 clamp(14px, 3vw, 32px) 14px;
    transition: grid-template-columns 160ms ease;
  }

  .workspace.filters-collapsed {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .filters {
    display: grid;
    align-self: start;
    gap: 12px;
    max-height: 100%;
    min-height: 0;
    overflow: auto;
    padding: 11px;
    border: 1px solid #d8ded4;
    border-radius: 8px;
    background: #fffdfa;
  }

  .filters.collapsed {
    overflow: hidden;
    padding: 8px 6px;
  }

  .filter-content {
    display: grid;
    gap: 14px;
  }

  .filter-heading,
  .date-label,
  .reset-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .filter-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: #17211d;
    font-weight: 820;
  }

  .filter-heading div {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .filters.collapsed .filter-heading {
    justify-content: center;
  }

  .filters.collapsed .filter-heading div {
    display: none;
  }

  .collapse-button {
    display: inline-grid;
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    place-items: center;
    border: 1px solid #d8ded4;
    border-radius: 8px;
    background: #ffffff;
    color: #445048;
    cursor: pointer;
  }

  .collapse-button:hover,
  .collapse-button:focus-visible {
    border-color: #26342e;
    outline: none;
  }

  .filter-group {
    display: grid;
    gap: 7px;
  }

  .filter-accordion {
    border-top: 1px solid #e3e7df;
    padding-top: 8px;
  }

  .filter-accordion summary {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    cursor: pointer;
    color: #26342e;
    font-size: 0.8rem;
    font-weight: 760;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  .filter-accordion summary :global(svg) {
    flex-shrink: 0;
    transform: rotate(-90deg);
  }

  .filter-accordion[open] summary :global(svg) {
    transform: rotate(0);
  }

  .filter-accordion small {
    display: block;
    margin-top: 2px;
    color: #687267;
    font-size: 0.68rem;
    font-weight: 400;
  }

  .filter-options {
    display: grid;
    gap: 7px;
    padding-top: 8px;
  }

  summary:focus-visible {
    outline: 2px solid #26342e;
    outline-offset: 2px;
  }

  .date-label {
    color: #536055;
    font-size: 0.82rem;
    font-weight: 760;
  }

  .date-slider {
    min-width: 0;
    width: 100%;
    accent-color: #26342e;
  }

  .date-slider-row {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    align-items: end;
    gap: 8px;
  }

  .date-slider-stack {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .playback-button {
    display: inline-grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border: 1px solid #cfd8ca;
    border-radius: 8px;
    background: #ffffff;
    color: #26342e;
    cursor: pointer;
  }

  .playback-button.playing {
    border-color: #26342e;
    background: #26342e;
    color: #ffffff;
  }

  .playback-button:hover,
  .playback-button:focus-visible {
    border-color: #26342e;
    outline: none;
  }

  .date-scale {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: #7d877b;
    font-size: 0.66rem;
  }

  .date-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 7px;
  }

  input[type='date'] {
    width: 100%;
    min-height: 34px;
    padding: 6px 8px;
    border: 1px solid #cfd8ca;
    border-radius: 8px;
    background: #ffffff;
    color: #17211d;
  }

  .reset-button {
    justify-content: center;
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid #cfd8ca;
    border-radius: 8px;
    background: #f8f4ea;
    color: #26342e;
    font-weight: 760;
    cursor: pointer;
  }

  .reset-button:hover,
  .reset-button:focus-visible {
    border-color: #26342e;
    outline: none;
  }

  .date-readout {
    margin: 0;
    color: #687267;
    font-size: 0.78rem;
  }

  .filter-group label:not(.date-label) {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    align-items: center;
    gap: 8px;
    min-height: 24px;
    color: #26342e;
    font-size: 0.8rem;
  }

  .filter-group label.muted {
    color: #929990;
  }

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: #13824f;
  }

  .filter-group em {
    min-width: 24px;
    padding: 2px 6px;
    border-radius: 999px;
    background: #eef2eb;
    color: #687267;
    font-size: 0.7rem;
    font-style: normal;
    font-weight: 780;
    text-align: center;
  }

  .cards-area {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 10px;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .cards-summary {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
  }

  .cards-summary h2 {
    margin-top: 4px;
    font-size: clamp(1rem, 1.7vw, 1.35rem);
  }

  .show-hidden-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid #cfd8ca;
    border-radius: 8px;
    background: #fffdfa;
    color: #26342e;
    font-size: 0.78rem;
    font-weight: 760;
    cursor: pointer;
  }

  .show-hidden-button:hover,
  .show-hidden-button:focus-visible {
    border-color: #26342e;
    outline: none;
  }

  .cards-and-detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
    align-items: start;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }

  .cards-and-detail.with-detail {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  }

  .with-detail .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
    gap: 6px;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(188px, 1fr));
    align-content: start;
    gap: 10px;
    min-width: 0;
  }

  .cards-stack {
    display: grid;
    align-content: start;
    gap: 12px;
    max-height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    padding-right: 2px;
  }

  .hidden-card-section {
    padding-bottom: 10px;
    border-bottom: 1px solid #d8ded4;
  }

  .hidden-card-heading {
    cursor: pointer;
    display: grid;
    grid-template-columns: 15px minmax(0, 1fr) auto;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #687267;
    font-size: 0.74rem;
    font-weight: 820;
    text-transform: uppercase;
    min-height: 32px;
    list-style: none;
  }

  .hidden-card-heading h3 {
    margin: 0;
    font-size: inherit;
  }

  .hidden-card-heading .hidden-collapse-label,
  .hidden-card-heading :global(.hidden-collapse-icon),
  .hidden-card-section[open] .hidden-expand-label,
  .hidden-card-section[open] :global(.hidden-expand-icon) {
    display: none;
  }

  .hidden-card-section[open] .hidden-collapse-label,
  .hidden-card-section[open] :global(.hidden-collapse-icon) {
    display: inline;
  }

  .hidden-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .hidden-cards-grid {
    margin-top: 8px;
  }

  .hidden-card-heading span {
    color: #26342e;
    text-transform: none;
    font-size: 0.76rem;
  }

  .empty-state {
    display: grid;
    grid-column: 1 / -1;
    min-height: 180px;
    place-items: center;
    border: 1px dashed #bdc7bb;
    border-radius: 8px;
    color: #687267;
  }

  @media (max-width: 1100px) {
    .cards-and-detail.with-detail {
      grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
    }
  }

  @media (max-width: 820px) {
    .tracker-page {
      display: block;
      height: auto;
      overflow: visible;
    }

    .project-header {
      align-items: start;
      flex-direction: column;
    }

    .workspace {
      height: auto;
      grid-template-columns: 1fr;
      overflow: visible;
    }

    .cards-and-detail.with-detail {
      grid-template-columns: minmax(0, 1fr);
    }

    .with-detail .cards-stack {
      max-height: 220px;
    }

    .workspace.filters-collapsed {
      grid-template-columns: 1fr;
    }

    .filters {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      max-height: none;
    }

    .filter-heading {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 560px) {
    .filters {
      grid-template-columns: 1fr;
    }

    .project-header,
    .workspace {
      padding-right: 14px;
      padding-left: 14px;
    }
  }
</style>
