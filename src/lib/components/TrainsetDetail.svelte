<script lang="ts">
  import { ExternalLink, X } from '@lucide/svelte';
  import { formatDate } from '$lib/data/date';
  import { getMilestoneStage } from '$lib/data/lifecycle';
  import { lineColors, stageColors } from '$lib/data/resolve';
  import type { DatedTrainset } from '$lib/data/types';

  interface Props {
    trainset: DatedTrainset;
    onClear: () => void;
  }

  let { trainset, onClear }: Props = $props();

  let lineColor = $derived(lineColors[trainset.displayLine] ?? '#6f786f');
  let stageColor = $derived(stageColors[trainset.currentStage.id]);

  function sourceLabel(source: string): string {
    try {
      return new URL(source).hostname.replace(/^www\./, '');
    } catch {
      return source;
    }
  }
</script>

<aside
  class="detail-panel"
  style={`--line-color: ${lineColor}; --stage-color: ${stageColor.color}; --stage-soft: ${stageColor.softColor}; --stage-text: ${stageColor.textColor}`}
  aria-label={`${trainset.trainsetNumber} details`}
>
  <header class="detail-header">
    <div>
      <p class="eyebrow">{trainset.contractId}</p>
      <h2>{trainset.trainsetNumber}</h2>
      <p>{trainset.manufacturer}</p>
    </div>

    <button class="icon-button" type="button" aria-label="Close detail panel" onclick={onClear}>
      <X size={17} />
    </button>
  </header>

  <div class="status-strip">
    <span>{trainset.currentStage.label}</span>
    <strong>{formatDate(trainset.statusDate)}</strong>
  </div>

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
              <time datetime={milestone.date}>{formatDate(milestone.date)}</time>
            </div>

            {#if milestone.comments}
              <p>{milestone.comments}</p>
            {/if}

            {#if milestone.sources.length > 0}
              <div class="sources">
                {#each milestone.sources.slice(0, 3) as source}
                  <a href={source} target="_blank" rel="noreferrer">
                    {sourceLabel(source)}
                    <ExternalLink size={12} />
                  </a>
                {/each}
                {#if milestone.sources.length > 3}
                  <span>+{milestone.sources.length - 3} more</span>
                {/if}
              </div>
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
    padding: 14px;
    border: 1px solid #d8ded4;
    border-top: 5px solid var(--line-color);
    border-radius: 8px;
    background: #fffdfa;
    box-shadow: 0 18px 42px rgba(27, 34, 30, 0.12);
  }

  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .eyebrow {
    margin: 0 0 5px;
    color: #687267;
    font-size: 0.72rem;
    font-weight: 760;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1.45rem;
    line-height: 1;
  }

  .detail-header p:not(.eyebrow) {
    margin-top: 6px;
    color: #536055;
    font-size: 0.9rem;
  }

  .icon-button {
    display: inline-grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 1px solid #d8ded4;
    border-radius: 8px;
    background: #ffffff;
    cursor: pointer;
  }

  .icon-button:hover,
  .icon-button:focus-visible {
    border-color: var(--line-color);
    outline: none;
  }

  .status-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--stage-soft);
    color: #1f2924;
    font-size: 0.88rem;
  }

  .status-strip span {
    color: color-mix(in srgb, var(--stage-color) 74%, #17211d);
    font-weight: 760;
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
    color: color-mix(in srgb, var(--milestone-color) 68%, #111913);
  }

  time {
    color: color-mix(in srgb, var(--milestone-color) 58%, #445048);
    white-space: nowrap;
  }

  li p,
  .empty {
    color: #687267;
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .sources {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .sources a,
  .sources span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    padding: 4px 6px;
    border: 1px solid color-mix(in srgb, var(--milestone-color) 36%, #d8ded4);
    border-radius: 999px;
    background: color-mix(in srgb, var(--milestone-soft) 46%, #ffffff);
    color: #445048;
    font-size: 0.68rem;
    line-height: 1.1;
    text-decoration: none;
  }

  @media (max-width: 720px) {
    .spec-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 820px) {
    .detail-panel {
      max-height: 360px;
    }
  }
</style>
