<script lang="ts">
  import { milestoneDateLabel } from '$lib/data/evidence';
  import { lineColors, rollingStockDesign } from '$lib/data/presentation';
  import TrainIcon from './TrainIcon.svelte';
  import { stageColors } from '$lib/data/lifecycle';
  import type { DatedTrainset } from '$lib/data/types';

  interface Props {
    trainset: DatedTrainset;
    selected: boolean;
    onSelect: (id: string, origin?: HTMLElement) => void;
  }

  let { trainset, selected, onSelect }: Props = $props();

  let lineColor = $derived(lineColors[trainset.displayLine] ?? '#6f786f');
  let stage = $derived(stageColors[trainset.currentStage.id]);
  let stageLabel = $derived(trainset.currentStage.id === 'manufacturing' ? 'Pre-delivery' : trainset.currentStage.label);
  const stageInk: Record<string, string> = { service: '#0f6b3b', testing: '#1f6299', dispatch: '#7a5d00' };
  let design = $derived(rollingStockDesign[trainset.rollingStockId]);
  // "Since 11 Aug 2025", or "Inducted by 25 Sep 2026" when the date is qualified.
  let statusLine = $derived.by(() => {
    const m = trainset.statusMilestone;
    if (!m) return 'No delivery recorded yet';
    const label = milestoneDateLabel(m);
    const qualified = !/^\d/.test(label);
    const date = qualified ? label[0].toLowerCase() + label.slice(1) : label;
    if (trainset.currentStage.id === 'service') return qualified ? `Inducted ${date}` : `Since ${date}`;
    return `${m.label} ${qualified ? date : `on ${date}`}`;
  });
</script>

<article
  id={`card-${trainset.id}`}
  class="trainset-card"
  class:selected
  style={`--line-color: ${lineColor}; --stage-color: ${stage.color}; --stage-text: ${stageInk[trainset.currentStage.id] ?? '#5d685f'}`}
>
  <button
    class="select-button"
    id={`card-select-${trainset.id}`}
    type="button"
    aria-pressed={selected}
    aria-label={`${trainset.trainsetNumber}, ${trainset.lineSummary}, ${trainset.manufacturer}, ${stageLabel}. Show details`}
    onclick={(event) => onSelect(trainset.id, event.currentTarget)}
  >
    <span class="top">
      {#if design}<TrainIcon {design} size={22} color={lineColor} />{/if}
      <span class="number tnum">{trainset.trainsetNumber}</span>
    </span>
    <span class="status"><span class="stage-dot"></span>{stageLabel}</span>
    <span class="when tnum">{statusLine}</span>
  </button>
</article>

<style>
  .trainset-card { position: relative; border-radius: 10px; background: var(--surface); border: 1px solid #dfe4db; transition: border-color 120ms ease, box-shadow 120ms ease; }
  .trainset-card:hover { border-color: var(--faint); }
  .trainset-card.selected { border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink); }
  .select-button { display: flex; flex-direction: column; gap: 7px; width: 100%; padding: 13px 14px 12px; border: 0; background: transparent; text-align: left; border-radius: inherit; }
  .top { display: flex; align-items: center; gap: 8px; padding-right: 22px; }
  .number { font-family: var(--font-display); font-size: 21px; font-weight: 800; letter-spacing: -0.01em; line-height: 1; }
  .status { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--stage-text); }
  .stage-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--stage-color); flex: none; }
  .when { font-size: 12px; color: var(--muted); line-height: 1.35; }
</style>
