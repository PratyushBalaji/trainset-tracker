<script lang="ts">
  import { EyeOff } from '@lucide/svelte';
  import {
    addDays,
    daysBetween,
    formatDate,
    makeMonthTicks,
    parseIsoDate,
    percentageBetween
  } from '$lib/data/date';
  import { lineColors, lineLabels, stageColors, timelineStageDefinitions } from '$lib/data/resolve';
  import type { DateBounds, DatedTrainset, StageId, TimelineSegment } from '$lib/data/types';

  interface Props {
    trainsets: DatedTrainset[];
    selectedDate: string;
    bounds: DateBounds;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onHideFromChart: (id: string) => void;
    onDateChange: (date: string) => void;
  }

  const labelColumnWidth = 92;
  const axisHeight = 32;
  const canvasSidePadding = 12;
  const canvasBottomPadding = 10;
  const plotSidePadding = 48;
  const plotVerticalPadding = 28;

  let {
    trainsets,
    selectedDate,
    bounds,
    selectedId,
    onSelect,
    onHideFromChart,
    onDateChange
  }: Props = $props();

  let canvasElement = $state<HTMLDivElement | null>(null);
  let isPointerInside = $state(false);
  let isDraggingDate = $state(false);
  let hoverPercent = $state(0);
  let hoverDate = $state('');
  let highlightedStageId = $state<StageId | null>(null);

  let ticks = $derived(makeMonthTicks(bounds.start, bounds.end));
  let tickStride = $derived(Math.max(1, Math.ceil(ticks.length / 14)));
  let visibleTicks = $derived(
    ticks.filter((_, index) => index % tickStride === 0 || index === ticks.length - 1)
  );
  let cursorLeft = $derived(percentageBetween(selectedDate, bounds.start, bounds.end));
  let totalDays = $derived(daysBetween(bounds.start, bounds.end));

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  function stageStyle(stageId: StageId): string {
    const stageColor = stageColors[stageId];
    return `--stage-color: ${stageColor.color}; --stage-soft: ${stageColor.softColor}; --stage-text: ${stageColor.textColor};`;
  }

  function segmentStyle(segment: TimelineSegment): string {
    const left = percentageBetween(segment.start, bounds.start, bounds.end);
    const right = percentageBetween(segment.end, bounds.start, bounds.end);
    return `left: ${left}%; width: ${Math.max(right - left, 0.7)}%; ${stageStyle(segment.stageId)}`;
  }

  function segmentTitle(trainset: DatedTrainset, segment: TimelineSegment): string {
    const sourceCount = segment.sourceMilestones.reduce(
      (count, milestone) => count + milestone.sources.length,
      0
    );

    return `${trainset.trainsetNumber} - ${segment.label}: ${formatDate(segment.start)} to ${formatDate(
      segment.end
    )}${sourceCount ? ` (${sourceCount} sources)` : ''}`;
  }

  function formatTick(date: string): string {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC'
    }).format(parseIsoDate(date));
  }

  function readPointer(event: PointerEvent): { percent: number; date: string } {
    const rect = canvasElement?.getBoundingClientRect();
    if (!rect) {
      return { percent: cursorLeft, date: selectedDate };
    }

    const trackLeft = rect.left + canvasSidePadding + labelColumnWidth + plotSidePadding;
    const trackWidth = Math.max(1, rect.width - labelColumnWidth - 2 * canvasSidePadding - 2 * plotSidePadding);
    const x = clamp(event.clientX - trackLeft, 0, trackWidth);
    const ratio = x / trackWidth;

    return {
      percent: ratio * 100,
      date: addDays(bounds.start, Math.round(totalDays * ratio))
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
    isPointerInside = true;
    updateHover(event, isDraggingDate);
  }

  function handlePointerDown(event: PointerEvent) {
    isDraggingDate = true;
    isPointerInside = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    updateHover(event, true);
    event.preventDefault();
  }

  function handlePointerUp(event: PointerEvent) {
    if (isDraggingDate) {
      updateHover(event, true);
    }

    isDraggingDate = false;

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

  function clearStageHighlight(stageId: StageId) {
    if (highlightedStageId === stageId) {
      highlightedStageId = null;
    }
  }

  function stopChartDrag(event: PointerEvent) {
    event.stopPropagation();
  }

  function selectTrainset(event: MouseEvent, id: string) {
    event.stopPropagation();
    onSelect(id);
  }

  function hideTrainsetFromChart(event: MouseEvent, id: string) {
    event.stopPropagation();
    onHideFromChart(id);
  }
</script>

<section class="gantt-section" aria-label="Lifecycle timeline">
  <div class="timeline-heading">
    <div>
      <p>Lifecycle timeline</p>
      <h2>{trainsets.length} trainsets</h2>
    </div>

    <div class="legend" aria-label="Lifecycle legend">
      {#each timelineStageDefinitions as stage}
        <button
          class:phase-muted={highlightedStageId !== null && highlightedStageId !== stage.id}
          class:phase-highlighted={highlightedStageId === stage.id}
          class="legend-item"
          type="button"
          style={stageStyle(stage.id)}
          aria-label={`Highlight ${stage.filterLabel}`}
          onblur={() => clearStageHighlight(stage.id)}
          onfocus={() => (highlightedStageId = stage.id)}
          onpointerenter={() => (highlightedStageId = stage.id)}
          onpointerleave={() => clearStageHighlight(stage.id)}
        >
          <span class={`legend-swatch stage-${stage.id}`} aria-hidden="true"></span>
          <span>{stage.filterLabel}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="timeline-shell">
    <div
      bind:this={canvasElement}
      class:dragging={isDraggingDate}
      class="timeline-canvas"
      role="group"
      aria-label="Drag across the Gantt chart to move the date cursor"
      style={`--cursor-left: ${cursorLeft}%; --hover-left: ${hoverPercent}%; --label-width: ${labelColumnWidth}px; --axis-height: ${axisHeight}px; --canvas-pad-x: ${canvasSidePadding}px; --canvas-pad-bottom: ${canvasBottomPadding}px; --plot-pad-x: ${plotSidePadding}px; --plot-pad-y: ${plotVerticalPadding}px`}
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerUp}
      onpointerleave={handlePointerLeave}
    >
      <div class="axis-row" aria-hidden="true">
        <span></span>
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

      <div class="timeline-track-layer" aria-hidden="true">
        <span class="selected-date-line">
          <span>{formatDate(selectedDate)}</span>
        </span>

        {#if isPointerInside || isDraggingDate}
          <span class="hover-date-line"></span>
          <span class="hover-date-handle">
            {formatDate(hoverDate || selectedDate)}
          </span>
        {/if}
      </div>

      <div class="timeline-rows">
        {#each trainsets as trainset}
          <div class:selected={selectedId === trainset.id} class="timeline-row">
            <div class="row-label" style={`--line-color: ${lineColors[trainset.displayLine] ?? '#6f786f'}`}>
              <button
                class="row-select-button"
                type="button"
                onpointerdown={stopChartDrag}
                onpointerup={stopChartDrag}
                onclick={(event) => selectTrainset(event, trainset.id)}
              >
                <strong>{trainset.trainsetNumber}</strong>
                <small>{lineLabels[trainset.displayLine] ?? trainset.displayLine}</small>
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

            <div class="lane" role="img" aria-label={`${trainset.trainsetNumber} lifecycle`}>
              <div class="lane-plot">
                <span class="lane-cursor" style={`left: ${cursorLeft}%`}></span>

                {#if trainset.timelineSegments.length === 0}
                  <span class="no-data">No data recorded</span>
                {:else}
                  {#each trainset.timelineSegments as segment}
                    <button
                      class:phase-highlighted={highlightedStageId === segment.stageId}
                      class:phase-muted={highlightedStageId !== null && highlightedStageId !== segment.stageId}
                      class={`segment stage-${segment.stageId}`}
                      style={segmentStyle(segment)}
                      title={segmentTitle(trainset, segment)}
                      type="button"
                      onblur={() => clearStageHighlight(segment.stageId)}
                      onfocus={() => (highlightedStageId = segment.stageId)}
                      onpointerenter={() => (highlightedStageId = segment.stageId)}
                      onpointerdown={stopChartDrag}
                      onpointerleave={() => clearStageHighlight(segment.stageId)}
                      onpointerup={stopChartDrag}
                      onclick={(event) => selectTrainset(event, trainset.id)}
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
</section>

<style>
  .gantt-section {
    display: grid;
    gap: 10px;
    min-height: 0;
    overflow: visible;
    padding: 12px clamp(14px, 3vw, 32px) 14px;
    border-top: 1px solid #d8ded4;
    background: #eef2eb;
  }

  .timeline-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
  }

  .timeline-heading p,
  .timeline-heading h2 {
    margin: 0;
  }

  .timeline-heading p {
    color: #687267;
    font-size: 0.76rem;
    font-weight: 760;
    text-transform: uppercase;
  }

  .timeline-heading h2 {
    margin-top: 4px;
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
    opacity: 0.4;
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
    overflow: visible;
    border: 1px solid #d3dbcf;
    border-radius: 8px;
    background: #fffdfa;
  }

  .timeline-canvas {
    position: relative;
    display: grid;
    gap: 0;
    width: 100%;
    min-width: 0;
    padding: 0 var(--canvas-pad-x) var(--canvas-pad-bottom);
    touch-action: none;
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
    translate: -1px 0;
  }

  .selected-date-line {
    left: var(--cursor-left);
    border-left: 2px dashed #26342e;
  }

  .selected-date-line span {
    position: absolute;
    top: -25px;
    left: 50%;
    padding: 3px 6px;
    border-radius: 999px;
    background: #26342e;
    color: #ffffff;
    font-size: 0.66rem;
    translate: -50% 0;
    white-space: nowrap;
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

  .timeline-row {
    min-height: 30px;
    border-bottom: 1px solid #eef1ea;
  }

  .timeline-row:last-child {
    border-bottom: 0;
  }

  .timeline-rows {
    padding: var(--plot-pad-y) 0;
  }

  .timeline-row.selected {
    background: #f8f4ea;
  }

  .row-label {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24px;
    align-items: center;
    min-width: 0;
    border-left: 4px solid var(--line-color);
    background: #fffdfa;
  }

  .timeline-row.selected .row-label {
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
    display: grid;
    min-width: 0;
    gap: 1px;
    padding: 3px 5px 3px 8px;
    text-align: left;
  }

  .row-select-button:hover,
  .row-select-button:focus-visible {
    background: color-mix(in srgb, var(--line-color) 12%, #ffffff);
    outline: none;
  }

  .row-select-button strong {
    overflow: hidden;
    font-size: 0.76rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-select-button small {
    overflow: hidden;
    color: #687267;
    font-size: 0.6rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-hide-button {
    display: inline-grid;
    width: 22px;
    height: 22px;
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
    outline: none;
  }

  .lane {
    position: relative;
    min-width: 0;
    height: 30px;
    border-left: 1px solid #e3e7df;
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
    top: 6px;
    z-index: 2;
    display: block;
    min-width: 8px;
    height: 18px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--stage-color) 72%, #17211d);
    border-radius: 4px;
    color: transparent;
    cursor: pointer;
    transition:
      opacity 120ms ease,
      filter 120ms ease,
      top 120ms ease,
      height 120ms ease,
      box-shadow 120ms ease;
  }

  .segment.phase-muted {
    opacity: 0.2;
    filter: saturate(0.58) grayscale(0.18);
  }

  .segment.phase-highlighted {
    top: 5px;
    z-index: 4;
    height: 20px;
    opacity: 1;
    filter: saturate(1.15);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--stage-color) 24%, transparent);
  }

  .segment:hover,
  .segment:focus-visible {
    top: 4px;
    height: 22px;
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

  .stage-manufacturing {
    background: repeating-linear-gradient(
      45deg,
      var(--stage-soft),
      var(--stage-soft) 7px,
      var(--stage-color) 7px,
      var(--stage-color) 13px
    );
  }

  .stage-dispatch,
  .stage-service {
    background: var(--stage-color);
  }

  .stage-testing {
    background: repeating-linear-gradient(
      90deg,
      var(--stage-color),
      var(--stage-color) 8px,
      color-mix(in srgb, var(--stage-color) 68%, #ffffff) 8px,
      color-mix(in srgb, var(--stage-color) 68%, #ffffff) 14px
    );
  }

  @media (max-width: 860px) {
    .timeline-heading {
      align-items: start;
      flex-direction: column;
    }

    .legend {
      justify-content: flex-start;
    }

    .timeline-canvas {
      min-width: 720px;
    }
  }
</style>
