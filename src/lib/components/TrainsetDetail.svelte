<script lang="ts">
  import { X } from '@lucide/svelte';
  import { milestoneDateLabel } from '$lib/data/evidence';
  import { daysBetween } from '$lib/data/date';
  import { rollingStockDesign } from '$lib/data/presentation';
  import TrainIcon from './TrainIcon.svelte';
  import SourceLinks from './SourceLinks.svelte';
  import { getMilestoneStage } from '$lib/data/lifecycle';
  import { lineColors } from '$lib/data/presentation';
  import { stageColors } from '$lib/data/lifecycle';
  import type { DatedTrainset } from '$lib/data/types';

  interface Props {
    trainset: DatedTrainset;
    asOf: string;
    chartHref?: string;
    onClear: () => void;
  }

  let { trainset, asOf, chartHref, onClear }: Props = $props();
  const steps = [
    { label: 'Dispatched', keys: ['factory_dispatch'], color: '#dfab06' },
    { label: 'Delivered', keys: ['depot_arrival'], color: '#2f7fbd' },
    { label: 'Mainline tests', keys: ['first_mainline_run', 'mainline_testing'], color: '#2f7fbd' },
    { label: 'In service', keys: ['revenue_induction'], color: '#15884d' }
  ];
  let stepState = $derived(steps.map((step) => {
    const milestone = trainset.milestones.find((m) => step.keys.includes(m.key));
    return { ...step, milestone, done: !!milestone && milestone.date <= asOf };
  }));
  let daysInStage = $derived(trainset.statusMilestone ? daysBetween(trainset.statusMilestone.date, asOf) : null);

  let lineColor = $derived(lineColors[trainset.displayLine] ?? '#6f786f');
  let stageColor = $derived(stageColors[trainset.currentStage.id]);

</script>

<aside
  class="detail-panel"
  id="trainset-detail"
  tabindex="-1"
  style={`--line-color: ${lineColor}; --stage-color: ${stageColor.color}; --stage-soft: ${stageColor.softColor}; --stage-text: ${stageColor.textColor}`}
  aria-label={`${trainset.trainsetNumber} details`}
>
  <header class="detail-header">
    {#if rollingStockDesign[trainset.rollingStockId]}<TrainIcon design={rollingStockDesign[trainset.rollingStockId]} variant="outline" size={64} color={lineColor} />{/if}
    <div class="title-block">
      <p class="eyebrow">{trainset.lineSummary} · {trainset.contractId.replace('bmrcl-', '').toUpperCase()} · {trainset.manufacturer}</p>
      <h2 class="tnum">{trainset.trainsetNumber}</h2>
    </div>

    <button class="icon-button" type="button" aria-label="Close details" onclick={onClear}>
      <X size={17} />
    </button>
  </header>

  <ol class="steps" aria-label="Progress">
    {#each stepState as step}
      <li class:done={step.done} style={`--step: ${step.color}`}>
        <span class="bar"></span>
        <span class="step-label">{step.label}</span>
        <span class="step-date tnum">{step.milestone ? milestoneDateLabel(step.milestone) : 'Not recorded'}</span>
      </li>
    {/each}
  </ol>

  <div class="status-strip">
    <strong>{trainset.currentStage.label}{#if daysInStage !== null && trainset.currentStage.id !== 'no_data'} · {daysInStage} days{/if}</strong>
    {#if trainset.statusMilestone}<span class="tnum">Since {trainset.statusMilestone.label.toLowerCase()} on {milestoneDateLabel(trainset.statusMilestone)}</span>{/if}
  </div>
  {#if chartHref}<a class="return-chart" href={chartHref}>See on lifecycle chart →</a>{/if}

  <dl class="spec-grid">
    <div>
      <dt>Line</dt>
      <dd>{trainset.lineSummary}</dd>
    </div>
    <div>
      <dt>Signalling</dt>
      <dd>{trainset.rollingStock.signalling}</dd>
    </div>
    <div>
      <dt>Cars</dt>
      <dd>{trainset.rollingStock.cars_per_trainset}</dd>
    </div>
    <div>
      <dt>Gauge</dt>
      <dd>{trainset.rollingStock.gauge_mm} mm</dd>
    </div>
    <div>
      <dt>Power</dt>
      <dd>{trainset.rollingStock.traction_power}</dd>
    </div>
    <div>
      <dt>Carbody</dt>
      <dd>{trainset.rollingStock.carbody}</dd>
    </div>
  </dl>

  <section class="milestones" aria-label="Lifecycle milestones">
    <h3>Lifecycle</h3>

    {#if trainset.milestones.length === 0}
      <p class="empty">No dated lifecycle milestones yet.</p>
    {:else}
      <ol>
        {#each trainset.milestones as milestone}
          {@const milestoneStageColor = stageColors[getMilestoneStage(milestone.key)]}
          <li
            style={`--milestone-color: ${milestoneStageColor.color}; --milestone-soft: ${milestoneStageColor.softColor}; --milestone-text: ${milestoneStageColor.textColor}`}
          >
            <div class="milestone-main">
              <span>{milestone.label}</span>
              <time datetime={milestone.date}>{milestoneDateLabel(milestone)}</time>
            </div>

            {#if milestone.comments}
              <p>{milestone.comments}</p>
            {/if}

            {#if milestone.sources.length > 0}
              <SourceLinks sources={milestone.sources} label={`${trainset.trainsetNumber} ${trainset.lineSummary}, ${milestone.label}, ${milestoneDateLabel(milestone)}`} />
            {:else}<p>No direct reference recorded.</p>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  </section>
</aside>

<style>
  .detail-panel {
    display: grid;
    gap: 12px;
    align-self: start;
    max-height: 100%;
    min-height: 0;
    overflow: auto;
    padding: 18px 20px 20px;
    border: 1px solid #d8ded4;
    border-top: 6px solid var(--line-color);
    border-radius: 14px;
    background: #fffdfa;
    box-shadow: none;
  }

  .detail-header {
    position: sticky;
    /* Minus the panel's top padding, so the stuck header meets the panel's edge and nothing scrolls past above it. */
    top: -18px;
    z-index: 3;
    background: #fffdfa;
    padding: 12px 0;
    display: flex;
    align-items: center !important;
    justify-content: space-between;
    gap: 16px;
  }

  .eyebrow {
    margin: 0 0 5px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .detail-header p:not(.eyebrow) {
    margin-top: 6px;
    color: #536055;
    font-size: 0.9rem;
  }

  .icon-button {
    display: inline-grid;
    width: 44px;
    height: 44px;
    place-items: center;
    border: 1px solid #d8ded4;
    border-radius: 8px;
    background: #ffffff;
    cursor: pointer;
  }

  .icon-button:hover,
  .icon-button:focus-visible {
    border-color: var(--line-color);
    outline: 2px solid #2377b9;
  }

  .status-strip {
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    gap: 3px;
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--stage-soft);
    color: #1f2924;
    font-size: 0.88rem;
  }

  .status-strip span {
    color: var(--ink-3);
    font-weight: 400;
    font-size: 12px;
  }

  .spec-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px 12px;
    margin: 0;
  }

  .spec-grid div {
    min-width: 0;
    padding-bottom: 7px;
    border-bottom: 1px solid #e5e8e1;
  }

  dt {
    color: #687267;
    font-size: 0.72rem;
    font-weight: 720;
  }

  dd {
    margin: 3px 0 0;
    color: #1f2924;
    font-size: 0.88rem;
    line-height: 1.3;
  }

  .milestones {
    display: grid;
    gap: 9px;
  }

  h3 {
    font-size: 0.95rem;
  }

  ol {
    display: grid;
    gap: 9px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    gap: 5px;
    padding-left: 12px;
    border-left: 3px solid var(--milestone-color);
  }

  .milestone-main {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.86rem;
    font-weight: 760;
  }

  .milestone-main span {
    color: #26342e;
  }

  time {
    color: #445048;
    text-align: right;
  }

  li p,
  .empty {
    color: #687267;
    font-size: 0.8rem;
    line-height: 1.45;
  }

  ol.steps { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
  .steps li { display: flex; flex-direction: column; gap: 5px; padding: 0; border: 0; }
  .steps .bar { height: 6px; border-radius: 3px; background: #dfe4db; }
  .steps li.done .bar { background: var(--step); }
  .step-label { font-size: 11px; font-weight: 600; color: var(--ink-2); }
  .steps li:not(.done) .step-label { color: var(--muted); }
  .step-date { font-size: 11px; color: var(--muted); line-height: 1.3; }
  .status-strip strong { font-size: 14px; color: var(--ink); }
  .detail-header .title-block { flex: 1; min-width: 0; }
  .detail-panel:focus-visible { outline: none !important; }
  .return-chart { font-weight: 600; color: var(--ink) !important; font-size: 13px !important; line-height: 1.6; }
  .detail-panel :global(a:focus-visible) { scroll-margin-top: calc(var(--site-header-height) + 150px); }
  .detail-panel { scroll-margin-top: calc(var(--site-header-height) + 12px); }

  @media (max-width: 720px) {
    .spec-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 820px) {
    .detail-panel {
      max-height: none;
      overflow: visible;
    }
    .detail-header { top: var(--site-header-height); }
    .milestone-main { flex-wrap: wrap; }
  }
</style>
