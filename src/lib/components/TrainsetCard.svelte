<script lang="ts">
  import { Eye, EyeOff, TrainFront } from '@lucide/svelte';
  import { formatDate } from '$lib/data/date';
  import { lineColors, stageColors } from '$lib/data/resolve';
  import type { DatedTrainset } from '$lib/data/types';

  interface Props {
    trainset: DatedTrainset;
    hiddenFromChart: boolean;
    selected: boolean;
    onSelect: (id: string) => void;
    onToggleChartVisibility: (id: string) => void;
  }

  let { trainset, hiddenFromChart, selected, onSelect, onToggleChartVisibility }: Props = $props();

  let lineColor = $derived(lineColors[trainset.displayLine] ?? '#6f786f');
  let stageColor = $derived(stageColors[trainset.currentStage.id]);
  let sourceCount = $derived(
    trainset.milestones.reduce((count, milestone) => count + milestone.sources.length, 0)
  );
</script>

<article
  class:hidden-from-chart={hiddenFromChart}
  class:selected
  class={`trainset-card stage-${trainset.currentStage.id}`}
  style={`--line-color: ${lineColor}; --stage-color: ${stageColor.color}; --stage-soft: ${stageColor.softColor}; --stage-text: ${stageColor.textColor}`}
>
  <div class="card-top">
    <button
      class="select-button"
      type="button"
      aria-pressed={selected}
      aria-label={`Show details for ${trainset.trainsetNumber}`}
      onclick={() => onSelect(trainset.id)}
    >
      <span class="train-number"><TrainFront size={15} strokeWidth={2.2} /> {trainset.trainsetNumber}</span>
      <span class="line-chip">{trainset.lineSummary}</span>
    </button>

    <button
      class="hide-button"
      type="button"
      title={hiddenFromChart ? `Show ${trainset.trainsetNumber} in chart` : `Hide ${trainset.trainsetNumber} from chart`}
      aria-label={hiddenFromChart ? `Show ${trainset.trainsetNumber} in chart` : `Hide ${trainset.trainsetNumber} from chart`}
      aria-pressed={hiddenFromChart}
      onclick={() => onToggleChartVisibility(trainset.id)}
    >
      {#if hiddenFromChart}
        <Eye size={15} />
      {:else}
        <EyeOff size={15} />
      {/if}
    </button>
  </div>

  <button class="card-body" type="button" onclick={() => onSelect(trainset.id)}>
    <span class="manufacturer">{trainset.manufacturer}</span>

    <span class="status-row">
      <span class="stage-dot"></span>
      <span>{trainset.currentStage.label}</span>
    </span>

    <span class="meta-row">
      <span>{formatDate(trainset.statusDate)}</span>
      <span>{sourceCount} sources</span>
    </span>
  </button>
</article>

<style>
  .trainset-card {
    display: grid;
    gap: 5px;
    min-height: 108px;
    padding: 9px 10px 10px;
    border: 1px solid color-mix(in srgb, var(--line-color) 34%, #cfd6cc);
    border-left: 4px solid var(--line-color);
    border-radius: 8px;
    background: #fffdfa;
    box-shadow: 0 12px 28px rgba(28, 35, 29, 0.08);
    text-align: left;
    transition:
      transform 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease;
  }

  .trainset-card.hidden-from-chart {
    opacity: 0.62;
  }

  .trainset-card:hover,
  .trainset-card:focus-within,
  .trainset-card.selected {
    transform: translateY(-2px);
    border-color: var(--line-color);
    box-shadow: 0 16px 34px rgba(28, 35, 29, 0.14);
    outline: none;
  }

  .card-top,
  .meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .select-button,
  .hide-button,
  .card-body {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .select-button,
  .card-body {
    min-width: 0;
    padding: 0;
    text-align: left;
  }

  .select-button {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
  }

  .hide-button {
    display: inline-grid;
    flex: 0 0 auto;
    width: 27px;
    height: 27px;
    place-items: center;
    border: 1px solid transparent;
    border-radius: 7px;
    color: #687267;
    opacity: 0.78;
  }

  .hide-button:hover,
  .hide-button:focus-visible {
    border-color: color-mix(in srgb, var(--line-color) 36%, #d8ded4);
    background: color-mix(in srgb, var(--line-color) 10%, #ffffff);
    color: #26342e;
    outline: none;
  }

  .trainset-card.hidden-from-chart .hide-button {
    border-color: color-mix(in srgb, var(--line-color) 34%, #d8ded4);
    background: color-mix(in srgb, var(--line-color) 11%, #ffffff);
    color: #0b5fe8;
    opacity: 1;
  }

  .card-body {
    display: grid;
    gap: 5px;
  }

  .card-body:focus-visible,
  .select-button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--line-color) 68%, #26342e);
    outline-offset: 2px;
  }

  .train-number {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    gap: 6px;
    font-size: 0.92rem;
    font-weight: 760;
    white-space: nowrap;
  }

  .line-chip {
    min-width: 0;
    max-width: 100%;
    padding: 3px 7px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--line-color) 15%, #ffffff);
    color: color-mix(in srgb, var(--line-color) 64%, #17211d);
    font-size: 0.68rem;
    font-weight: 720;
    line-height: 1.2;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .manufacturer {
    overflow: hidden;
    color: #536055;
    font-size: 0.76rem;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-row {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.8rem;
    font-weight: 760;
  }

  .stage-dot {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: var(--stage-color);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--stage-color) 18%, transparent);
  }

  .meta-row {
    color: #687267;
    font-size: 0.68rem;
  }
</style>
