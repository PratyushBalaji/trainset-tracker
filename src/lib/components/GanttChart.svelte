<script lang="ts">
  import { onDestroy, tick, type Snippet } from 'svelte';
  import { EyeOff } from '@lucide/svelte';
  import IntervalPreview from './IntervalPreview.svelte';
  import { emphasizedStage, togglePinned } from '$lib/data/chart-interaction';
  import { createChartDrag } from '$lib/data/chart-drag';
  import { milestoneDateLabel, referenceCount } from '$lib/data/evidence';
  import {
    formatDate,
    addDays,
    clampIsoDate,
    makeMonthTicks,
    parseIsoDate,
    percentageBetween
  } from '$lib/data/date';
  import { lineColors, lineLabels, manufacturerShortLabels } from '$lib/data/presentation';
  import { stageColors, timelineStageDefinitions } from '$lib/data/lifecycle';
  import type { DateBounds, DatedTrainset, StageId, TimelineSegment } from '$lib/data/types';

  interface Props {
    trainsets: DatedTrainset[];
    selectedDate: string;
    bounds: DateBounds;
    maxDate: string;
    selectedId: string | null;
    onSelect: (id: string, origin?: HTMLElement) => void;
    onHideFromChart: (id: string) => void;
    onDateChange: (date: string) => void;
    onDragBoundsChange: (bounds: DateBounds | null) => void;
    /** Optional content under the heading, e.g. the hidden-trains control. */
    headingExtra?: Snippet;
  }

  // Match ServiceChart's 230px plot start and 20px outer inset.
  const labelColumnWidth = 210;
  const axisHeight = 32;
  const canvasSidePadding = 12;
  const canvasBottomPadding = 10;
  const plotSidePadding = 8;
  const plotVerticalPadding = 28;

  let {
    trainsets,
    selectedDate,
    bounds,
    maxDate,
    selectedId,
    onSelect,
    onHideFromChart,
    onDateChange,
    onDragBoundsChange,
    headingExtra
  }: Props = $props();

  let canvasElement = $state<HTMLDivElement | null>(null);
  let canvasWidth = $state(1100);
  let isPointerInside = $state(false);
  let isDraggingDate = $state(false);
  let drag = $state<ReturnType<typeof createChartDrag> | null>(null);
  let hoverPercent = $state(0);
  let hoverDate = $state('');
  let cursorLabelWidth = $state(0);
  let hoverLabelWidth = $state(0);
  let pinnedStage = $state<StageId | null>(null);
  let previewStage = $state<StageId | null>(null);
  let highlightedStageId = $derived(emphasizedStage(pinnedStage, previewStage));
  type Inspection = { trainId: string; segmentId: string; origin: HTMLElement };
  let pinnedInspection = $state<Inspection | null>(null);
  let previewInspection = $state<Inspection | null>(null);
  let inspected = $derived(pinnedInspection ?? previewInspection);
  let inspectedTrain = $derived(trainsets.find((t) => t.id === inspected?.trainId));
  let inspectedSegment = $derived(inspectedTrain?.timelineSegments.find((s) => s.id === inspected?.segmentId));
  let leaveTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressFocus = false;

  $effect(() => {
    const domain = `${bounds.start}:${bounds.end}`;
    void domain;
    isPointerInside = false;
    hoverDate = '';
    previewInspection = null;
  });
  $effect(() => {
    if (pinnedInspection && !trainsets.some((t) => t.id === pinnedInspection!.trainId && t.timelineSegments.some((s) => s.id === pinnedInspection!.segmentId))) pinnedInspection = null;
    if (previewInspection && !trainsets.some((t) => t.id === previewInspection!.trainId)) previewInspection = null;
  });
  onDestroy(() => clearTimeout(leaveTimer));

  function keepPreview() { clearTimeout(leaveTimer); }
  function leavePreview() {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => { previewInspection = null; }, 180);
  }
  function inspect(event: Event, trainId: string, segmentId: string, pin = false) {
    if (!pin && event instanceof PointerEvent && event.pointerType !== 'mouse') return;
    if (!pin && event.type === 'focus' && suppressFocus) { suppressFocus = false; return; }
    keepPreview();
    const element = event.currentTarget as HTMLElement;
    const next = { trainId, segmentId, origin: element };
    if (pin) {
      pinnedInspection = pinnedInspection?.trainId === trainId && pinnedInspection.segmentId === segmentId ? null : next;
      previewInspection = null;
      if (pinnedInspection && event instanceof MouseEvent && event.detail === 0) void tick().then(() => document.querySelector<HTMLButtonElement>('.interval-preview .preview-close')?.focus());
    } else if (!pinnedInspection) previewInspection = next;
  }
  function dismissInspection() {
    const element = inspected?.origin;
    pinnedInspection = null;
    previewInspection = null;
    keepPreview();
    if (element?.isConnected && element !== document.activeElement) { suppressFocus = true; element.focus({ preventScroll: true }); }
  }
  function openInspectedTrain() {
    if (!inspected) return;
    const { trainId, origin } = inspected;
    pinnedInspection = null;
    previewInspection = null;
    onSelect(trainId, origin);
  }

  let ticks = $derived(makeMonthTicks(bounds.start, bounds.end));
  let tickCapacity = $derived(Math.max(2, Math.floor((canvasWidth - labelColumnWidth - 2 * canvasSidePadding - 2 * plotSidePadding) / 64)));
  let tickStride = $derived(Math.max(1, Math.ceil((ticks.length - 1) / (tickCapacity - 1))));
  let visibleTicks = $derived(
    ticks.filter((_, index) => index === 0 || index === ticks.length - 1 || (index % tickStride === 0 && ticks.length - 1 - index >= tickStride * 0.6))
  );
  let cursorLeft = $derived(percentageBetween(selectedDate, bounds.start, bounds.end));
  let cursorVisible = $derived(selectedDate >= bounds.start && selectedDate <= bounds.end);

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  function dateLabelOffset(percent: number, width: number): number {
    const inset = canvasSidePadding + plotSidePadding;
    const center = inset + labelColumnWidth + (canvasWidth - labelColumnWidth - 2 * inset) * percent / 100;
    return clamp(center, width / 2 + 8, canvasWidth - width / 2 - 8) - center;
  }

  function stageStyle(stageId: StageId): string {
    const stageColor = stageColors[stageId];
    return `--stage-color: ${stageColor.color}; --stage-soft: ${stageColor.softColor}; --stage-text: ${stageColor.textColor};`;
  }

  function segmentStyle(segment: TimelineSegment): string {
    const left = percentageBetween(segment.start, bounds.start, bounds.end);
    const right = percentageBetween(segment.end, bounds.start, bounds.end);
    // Keep minimum-width intervals inside their recorded or chart-boundary end.
    return `right: ${100 - right}%; width: ${Math.max(right - left, 0.7)}%; ${stageStyle(segment.stageId)}`;
  }

  function segmentTitle(trainset: DatedTrainset, segment: TimelineSegment): string {
    const sourceCount = segment.sourceMilestones.reduce(
      (count, milestone) => count + milestone.sources.length,
      0
    );

    return `${trainset.trainsetNumber} - ${segment.label}. Plotted interval: ${formatDate(segment.start)} to ${formatDate(
      segment.end
    )} (${referenceCount(sourceCount)}). Recorded dates: ${segment.sourceMilestones.map((m) => `${m.label}: ${milestoneDateLabel(m)}`).join('; ')}${segment.derived ? '. Interval extends to the chart boundary or an illustrative end, not a recorded event.' : ''}`;
  }

  function formatTick(date: string): string {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC'
    }).format(parseIsoDate(date));
  }

  function readPointer(event: PointerEvent): { percent: number; date: string } {
    const rect = canvasElement?.querySelector('.axis-plot')?.getBoundingClientRect();
    if (!rect) {
      return { percent: cursorLeft, date: selectedDate };
    }

    const trackLeft = rect.left;
    const trackWidth = Math.max(1, rect.width);
    const x = clamp(event.clientX - trackLeft, 0, trackWidth);
    const ratio = x / trackWidth;
    const date = (drag ?? createChartDrag(bounds, maxDate)).dateAtRatio(ratio);

    return {
      percent: percentageBetween(date, bounds.start, bounds.end),
      date
    };
  }

  function updateHover(event: PointerEvent, commitDate: boolean) {
    const pointer = readPointer(event);
    hoverPercent = pointer.percent;
    hoverDate = pointer.date;

    if (commitDate) {
      onDateChange(pointer.date);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isDraggingDate && (event.target as Element).closest('.segment, .row-label')) { isPointerInside = false; return; }
    isPointerInside = true;
    updateHover(event, isDraggingDate);
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    if (event.pointerType === 'touch' && !(event.target as Element).closest('[data-date-cursor]')) return;
    drag = createChartDrag(bounds, maxDate);
    onDragBoundsChange(drag.bounds);
    isDraggingDate = true;
    isPointerInside = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    updateHover(event, true);
    event.preventDefault();
  }

  function handlePointerUp(event: PointerEvent, commit = true) {
    if (isDraggingDate && commit) {
      updateHover(event, true);
    }

    isDraggingDate = false;
    drag = null;
    onDragBoundsChange(null);

    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerLeave() {
    if (!isDraggingDate) {
      isPointerInside = false;
    }
  }

  function stopChartDrag(event: PointerEvent) {
    event.stopPropagation();
  }

  function selectTrainset(event: MouseEvent, id: string) {
    event.stopPropagation();
    onSelect(id, event.currentTarget as HTMLElement);
  }

  function hideTrainsetFromChart(event: MouseEvent, id: string) {
    event.stopPropagation();
    onHideFromChart(id);
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape' && inspected) { event.preventDefault(); dismissInspection(); } }} />
<section class="gantt-section" id="lifecycle-chart" aria-label="Lifecycle timeline" tabindex="-1">
  <div class="timeline-heading">
    <div>
      <h2 class="tnum">{trainsets.length} trainsets recorded</h2>
      {#if headingExtra}{@render headingExtra()}{/if}
    </div>

    <div class="legend" aria-label="Lifecycle legend">
      {#each timelineStageDefinitions as stage}
        <button
          class:phase-muted={highlightedStageId !== null && highlightedStageId !== stage.id}
          class:phase-highlighted={highlightedStageId === stage.id}
          class:pinned={pinnedStage === stage.id}
          class="legend-item"
          type="button"
          style={stageStyle(stage.id)}
          aria-label={`Highlight ${stage.filterLabel}`}
          aria-pressed={pinnedStage === stage.id}
          onclick={() => { pinnedStage = togglePinned(pinnedStage, stage.id); previewStage = null; }}
          onblur={() => { previewStage = null; }}
          onfocus={() => { previewStage = stage.id; }}
          onpointerenter={(event) => { if (event.pointerType === 'mouse') previewStage = stage.id; }}
          onpointerleave={() => { previewStage = null; }}
        >
          <span class={`legend-swatch stage-${stage.id}`} aria-hidden="true"></span>
          <span>{stage.filterLabel}</span>
        </button>
      {/each}
    </div>
  </div>
  <div class="chart-links"><span class="pan-hint">Scroll to pan · Drag the date pill to scrub</span></div>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Native keyboard scrolling needs a focusable chart region.) -->
  <div class="timeline-shell" role="region" aria-label="Scrollable lifecycle chart" tabindex="0" onfocus={(event) => { const frame = event.currentTarget; requestAnimationFrame(() => { if (document.activeElement === frame) frame.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' }); }); }}>
    <div
      bind:this={canvasElement}
      bind:clientWidth={canvasWidth}
      class:dragging={isDraggingDate}
      class="timeline-canvas"
      data-range-start={bounds.start}
      data-range-end={bounds.end}
      role="group"
      aria-label="Drag across the Gantt chart to move the date cursor"
      style={`--cursor-left: ${cursorLeft}%; --hover-left: ${hoverPercent}%; --label-width: ${labelColumnWidth}px; --axis-height: ${axisHeight}px; --canvas-pad-x: ${canvasSidePadding}px; --canvas-pad-bottom: ${canvasBottomPadding}px; --plot-pad-x: ${plotSidePadding}px; --plot-pad-y: ${plotVerticalPadding}px`}
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={(event) => handlePointerUp(event, false)}
      onlostpointercapture={(event) => { if (isDraggingDate) handlePointerUp(event, false); }}
      onpointerleave={handlePointerLeave}
    >
      <div class="axis-row" aria-hidden="true">
        <span class="axis-label">Trainset</span>
        <div class="axis-track">
          <div class="axis-plot">
            {#each visibleTicks as tick}
              <span class="tick" style={`left: ${percentageBetween(tick, bounds.start, bounds.end)}%`}>
                {formatTick(tick)}
              </span>
            {/each}
          </div>
        </div>
      </div>

      <div class="timeline-track-layer">
        {#if cursorVisible}<span class="selected-date-line">
          <button bind:clientWidth={cursorLabelWidth} style={`margin-left: ${dateLabelOffset(cursorLeft, cursorLabelWidth)}px`} data-date-cursor type="button" aria-label={`Drag selected date, ${formatDate(selectedDate)}`} onkeydown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onDateChange(clampIsoDate(addDays(selectedDate, event.key === 'ArrowRight' ? 1 : -1), bounds.start, maxDate)); } }}>{formatDate(selectedDate)}</button>
        </span>{/if}

        {#if (isPointerInside || isDraggingDate) && hoverDate && hoverDate !== selectedDate}
          <span class="hover-date-line"></span>
          <span class="hover-date-handle" bind:clientWidth={hoverLabelWidth} style={`margin-left: ${dateLabelOffset(hoverPercent, hoverLabelWidth)}px`}>
            {formatDate(hoverDate || selectedDate)}
          </span>
        {/if}
      </div>

      <div class="timeline-rows">
        {#each trainsets as trainset, index (trainset.id)}
          {#if index === 0 || trainsets[index - 1].displayLine !== trainset.displayLine}
            {@const count = trainsets.filter((t) => t.displayLine === trainset.displayLine).length}
            <div class="group-row" style={`--line-color: ${lineColors[trainset.displayLine] ?? '#6f786f'}`}>
              <span class="group-name">{lineLabels[trainset.displayLine] ?? trainset.displayLine}</span>
              <span class="group-meta tnum">{count} train{count === 1 ? '' : 's'}</span>
            </div>
          {/if}
          <div class:selected={selectedId === trainset.id} class="timeline-row" style={`--line-color: ${lineColors[trainset.displayLine] ?? '#6f786f'}`}>
            <div class="row-label">
              <button
                class="row-select-button"
                id={`chart-name-${trainset.id}`}
                type="button"
                onpointerdown={stopChartDrag}
                onpointerup={stopChartDrag}
                onclick={(event) => selectTrainset(event, trainset.id)}
              >
                <strong class="tnum">{trainset.trainsetNumber}</strong>
                <small>{manufacturerShortLabels[trainset.manufacturer] ?? trainset.manufacturer}<span class="row-contract"> · {trainset.contractId.replace('bmrcl-', '').toUpperCase()}</span></small>
              </button>

              <button
                class="row-hide-button"
                type="button"
                title={`Hide ${trainset.trainsetNumber} from chart`}
                aria-label={`Hide ${trainset.trainsetNumber} from chart`}
                onpointerdown={stopChartDrag}
                onpointerup={stopChartDrag}
                onclick={(event) => hideTrainsetFromChart(event, trainset.id)}
              >
                <EyeOff size={15} />
              </button>
            </div>

            <div class="lane" role="group" aria-label={`${trainset.trainsetNumber} lifecycle`}>
              <div class="lane-plot">
                {#if cursorVisible}<span class="lane-cursor" style={`left: ${cursorLeft}%`}></span>{/if}

                {#if trainset.timelineSegments.length === 0}
                  <span class="no-data">No data recorded</span>
                {:else}
                  {#each trainset.timelineSegments as segment (segment.id)}
                    <button
                      class:phase-highlighted={highlightedStageId === segment.stageId}
                      class:phase-muted={highlightedStageId !== null && highlightedStageId !== segment.stageId}
                      class={`segment stage-${segment.stageId}`}
                      id={`chart-interval-${trainset.id}-${segment.id}`}
                      style={segmentStyle(segment)}
                      aria-label={segmentTitle(trainset, segment)}
                      aria-pressed={pinnedInspection?.trainId === trainset.id && pinnedInspection.segmentId === segment.id}
                      type="button"
                      onblur={leavePreview}
                      onfocus={(event) => inspect(event, trainset.id, segment.id)}
                      onpointerenter={(event) => inspect(event, trainset.id, segment.id)}
                      onpointerdown={stopChartDrag}
                      onpointerleave={leavePreview}
                      onpointerup={stopChartDrag}
                      onclick={(event) => { event.stopPropagation(); inspect(event, trainset.id, segment.id, true); }}
                    >
                      <span>{segment.label}</span>
                    </button>
                  {/each}
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
  {#if inspected && inspectedTrain && inspectedSegment}<IntervalPreview trainset={inspectedTrain} segment={inspectedSegment} pinned={Boolean(pinnedInspection)} anchor={inspected.origin} onClose={dismissInspection} onOpen={openInspectedTrain} onEnter={keepPreview} onLeave={leavePreview} />{/if}
</section>

<style>
  .gantt-section { scroll-margin-top: calc(var(--site-header-height) + 12px); }
  .chart-links { display: flex; gap: 18px; align-items: center; font-size: 12px; color: #536055; }
  .pan-hint { display: none; }
  .legend-item.pinned { background: #e3e9df; box-shadow: inset 0 -2px #26342e; border-radius: 4px; }
  .axis-label { display: flex; align-items: center; padding-left: 8px; }
  .row-contract { white-space: nowrap; }
  .axis-label { position: sticky; left: 0; z-index: 8; background: #fffdfa; }
  @media(max-width: 820px) { .row-hide-button { opacity: 1 !important; min-width: 36px; min-height: 36px; } .axis-row { font-size: 12px; } .timeline-row { min-height: 36px; } }
  .gantt-section {
    display: grid;
    min-width: 0;
    gap: 10px;
    min-height: 0;
    overflow: visible;
    padding: 0;
    background: transparent;
  }

  .timeline-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
  }

  .timeline-heading h2 {
    margin: 4px 0 0;
    font-size: clamp(1rem, 1.6vw, 1.3rem);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px 0;
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 20px;
    padding: 0 10px;
    border: 0;
    background: transparent;
    color: #445048;
    cursor: pointer;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 760;
    line-height: 1.1;
    transition:
      color 120ms ease,
      opacity 120ms ease;
  }

  .legend-item:first-child {
    padding-left: 0;
  }

  .legend-item + .legend-item {
    border-left: 1px solid rgba(112, 123, 113, 0.26);
  }

  .legend-swatch {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    border: 1px solid color-mix(in srgb, var(--stage-color) 68%, #17211d);
    border-radius: 4px;
    transition:
      box-shadow 120ms ease,
      filter 120ms ease;
  }

  .legend-item.phase-muted {
    opacity: 0.65;
  }

  .legend-item.phase-highlighted {
    color: #17211d;
    font-weight: 820;
  }

  .legend-item.phase-highlighted .legend-swatch {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--stage-color) 24%, transparent);
    filter: saturate(1.14);
  }

  .timeline-shell {
    overflow: auto;
    max-width: 100%;
    border: 1px solid #d8ded4;
    border-radius: 12px;
    background: #fffdfa;
  }

  .timeline-canvas {
    position: relative;
    display: grid;
    gap: 0;
    width: 100%;
    min-width: 960px;
    padding: 0 var(--canvas-pad-x) var(--canvas-pad-bottom);
    touch-action: pan-x pan-y;
    cursor: ew-resize;
  }

  .axis-row,
  .timeline-row {
    display: grid;
    grid-template-columns: var(--label-width) minmax(0, 1fr);
  }

  .axis-row {
    height: var(--axis-height);
    color: #6a746b;
    font-size: 0.68rem;
  }

  .axis-track {
    position: relative;
    border-bottom: 1px solid #e3e7df;
  }

  .axis-plot {
    position: absolute;
    inset: 0 var(--plot-pad-x) 0 var(--plot-pad-x);
  }

  .tick {
    position: absolute;
    top: 8px;
    translate: -50% 0;
    white-space: nowrap;
  }

  .timeline-track-layer {
    position: absolute;
    inset:
      calc(var(--axis-height) + var(--plot-pad-y))
      calc(var(--canvas-pad-x) + var(--plot-pad-x))
      calc(var(--canvas-pad-bottom) + var(--plot-pad-y))
      calc(var(--canvas-pad-x) + var(--label-width) + var(--plot-pad-x));
    z-index: 3;
    pointer-events: none;
  }

  .selected-date-line,
  .hover-date-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    translate: -50% 0;
  }

  .selected-date-line {
    left: var(--cursor-left);
    border-left: 2px dashed #26342e;
  }

  .selected-date-line button {
    position: absolute;
    top: -25px;
    left: 50%;
    padding: 3px 6px;
    border-radius: 999px;
    background: #26342e;
    color: #ffffff;
    translate: -50% 0;
    white-space: nowrap;
    pointer-events: auto;
    touch-action: none;
    border: 1px solid #26342e;
    min-height: 32px;
    font-size: 12px;
    cursor: ew-resize;
  }

  .hover-date-line {
    left: var(--hover-left);
    border-left: 1px solid rgba(38, 52, 46, 0.52);
  }

  .hover-date-handle {
    position: absolute;
    top: -14px;
    left: var(--hover-left);
    display: inline-grid;
    min-width: 68px;
    height: 21px;
    padding: 0 7px;
    place-items: center;
    translate: -50% -50%;
    border: 1px solid #26342e;
    border-radius: 999px;
    background: #fffdfa;
    color: #26342e;
    font-size: 0.66rem;
    font-weight: 760;
    white-space: nowrap;
    box-shadow: 0 6px 16px rgba(27, 34, 30, 0.18);
  }

  .group-row { display: flex; align-items: center; gap: 10px; height: 34px; padding: 10px 0 0 8px; position: sticky; left: 0; width: max-content; }
  .group-row .group-name { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; }
  .group-row .group-name::before { content: ''; width: 4px; height: 16px; border-radius: 2px; background: var(--line-color); }
  .group-meta { font-size: 12px; color: #5d685f; }
  .timeline-row {
    min-height: 26px;
    border-bottom: 1px solid #eef1ea;
  }

  .timeline-row:last-child {
    border-bottom: 0;
  }

  .timeline-rows {
    padding: var(--plot-pad-y) 0;
  }

  .timeline-row.selected,
  .timeline-row:hover {
    background: color-mix(in srgb, var(--line-color) 10%, #fffdfa);
  }

  .row-label {
    position: sticky;
    left: 0;
    z-index: 7;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 30px;
    align-items: center;
    min-width: 0;
    border-left: 4px solid var(--line-color);
    background: #fffdfa;
  }

  .timeline-row.selected .row-label,
  .timeline-row:hover .row-label {
    background: color-mix(in srgb, var(--line-color) 10%, #fffdfa);
  }

  .row-select-button,
  .row-hide-button {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .row-select-button {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    min-width: 0;
    gap: 6px;
    padding: 3px 5px 3px 8px;
    text-align: left;
  }

  .row-select-button:hover,
  .row-select-button:focus-visible {
    background: transparent;
  }

  .row-select-button:focus-visible {
    outline: 2px solid var(--line-color);
    outline-offset: -2px;
  }

  .row-select-button strong {
    flex: none;
    overflow: hidden;
    font-size: 0.76rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-select-button small {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #687267;
    font-size: 11px;
    white-space: nowrap;
  }

  .row-hide-button {
    display: inline-grid;
    width: 30px;
    height: 30px;
    place-items: center;
    border-radius: 999px;
    color: #0b5fe8;
    opacity: 0;
    transition:
      opacity 120ms ease,
      background 120ms ease;
  }

  .timeline-row:hover .row-hide-button,
  .row-label:focus-within .row-hide-button {
    opacity: 1;
  }

  .row-hide-button:hover,
  .row-hide-button:focus-visible {
    background: #e8f0ff;
    outline: 2px solid #2377b9;
  }

  .lane {
    position: relative;
    min-width: 0;
    min-height: 26px;
    align-self: stretch;
    box-shadow: inset 1px 0 #e3e7df;
  }

  .lane-plot {
    position: absolute;
    inset: 0 var(--plot-pad-x) 0 var(--plot-pad-x);
    background-image: linear-gradient(90deg, rgba(112, 123, 113, 0.16) 1px, transparent 1px);
    background-size: 16.66% 100%;
  }

  .lane-cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 1;
    width: 0;
    border-left: 1px dashed rgba(38, 52, 46, 0.34);
    pointer-events: none;
  }

  .segment {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
    display: block;
    min-width: 8px;
    height: 14px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--stage-color) 72%, #17211d);
    border-radius: 4px;
    color: transparent;
    cursor: pointer;
    transition:
      opacity 120ms ease,
      filter 120ms ease,
      height 120ms ease,
      box-shadow 120ms ease;
  }

  .segment.phase-muted {
    opacity: 0.42;
    filter: saturate(0.58) grayscale(0.18);
  }

  .segment.phase-highlighted {
    z-index: 4;
    height: 16px;
    opacity: 1;
    filter: saturate(1.15);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--stage-color) 24%, transparent);
  }

  .segment:hover,
  .segment:focus-visible {
    height: 18px;
    outline: 2px solid #26342e;
    outline-offset: 1px;
  }

  .no-data {
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding-left: 24px;
    color: #8c9488;
    font-size: 0.72rem;
  }

  .stage-dispatch,
  .stage-service,
  .stage-testing {
    background: var(--stage-color);
  }

  @media (max-width: 860px) {
    .pan-hint { display: inline; }
    .timeline-heading {
      align-items: start;
      flex-direction: column;
    }

    .legend {
      justify-content: flex-start;
    }

  }
</style>
