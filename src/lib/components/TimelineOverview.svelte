<script lang="ts">
  import { TrainFront } from '@lucide/svelte';
  import { formatDate } from '$lib/data/date';
  import { milestoneDateLabel } from '$lib/data/evidence';
  import { stageColors } from '$lib/data/lifecycle';
  import { historyDateLabel, layoutTimelineLens, type HistoryEntry } from '$lib/data/line-timeline';

  let { entries, positions, visibleRange, visibleIds, color, onJump }: {
    entries: HistoryEntry[]; positions: number[]; visibleRange: { start: number; end: number }; visibleIds: string[]; color: string; onJump: (id: string) => void;
  } = $props();
  let width = $state(800);
  let events = $derived(entries.map((entry, i) => ({ entry, position: positions[i] })).filter(({ entry }) => entry.kind !== 'today'));
  let focusIndices = $derived(events.flatMap(({ entry }, i) => visibleIds.includes(entry.id) ? [i] : []));
  let lens = $derived(layoutTimelineLens(events.map(({ position }) => position), focusIndices, visibleRange, width));
  let focused = $derived(lens.markers.filter((marker) => marker.focused).map((marker) => events[marker.indices[0]]?.entry).filter(Boolean));
  const dateLabel = (entry: HistoryEntry) => entry.lineMilestone ? historyDateLabel(entry.lineMilestone) : milestoneDateLabel(entry.groups?.[0]?.milestone);
</script>

<div class="overview" style={`--line-color: ${color}`}>
  <div class="focus-dates" aria-live="off">{#if focused.length}<span>{dateLabel(focused[0])}</span>{#if dateLabel(focused[0]) !== dateLabel(focused[focused.length - 1])}<span aria-hidden="true">&ndash;</span><span>{dateLabel(focused[focused.length - 1])}</span>{/if}{:else}<span>{formatDate(entries[entries.length - 1]?.date)}</span>{/if}</div>
  <div class="overview-track" bind:clientWidth={width} role="group" aria-label="Date-scaled timeline overview">
    <div class="rail"></div>
    {#if events.length}<div class="viewport-box" style={`left: ${lens.left}px; width: ${lens.right - lens.left}px`} role="img" aria-label="Magnified visible timeline date range"></div>{/if}
    {#each lens.markers as marker (events[marker.indices[0]].entry.id)}
      {@const entry = events[marker.indices[0]].entry}
      {@const key = entry.groups?.[0]?.milestone.key}
      {@const phase = key === 'revenue_induction' ? 'service' : key === 'factory_dispatch' || key === 'depot_arrival' ? 'dispatch' : 'testing'}
      {@const date = dateLabel(entry)}
      {@const count = marker.indices.length}
      <button type="button" class:cluster={count > 1} class:focused={marker.focused} class:train={count === 1 && entry.kind === 'train'} style={`left: ${marker.x}px; --event-color: ${count > 1 || entry.kind !== 'train' ? '#17211d' : stageColors[phase].color}`} aria-label={count > 1 ? `Jump to ${count} milestones, ${date} to ${dateLabel(events[marker.indices[count - 1]].entry)}` : `Jump to ${entry.title}, ${date}`} title={count > 1 ? `${count} milestones: ${date} to ${dateLabel(events[marker.indices[count - 1]].entry)}` : `${date} - ${entry.title}`} onclick={() => onJump(entry.id)}>
        {#if count > 1}<span>({count})</span>{:else if entry.kind === 'train'}<TrainFront size={16} strokeWidth={2.5} />{:else}<span class="milestone-dot"></span>{/if}
      </button>
    {/each}
    {#if events.length}<svg class="scale-connectors" viewBox={`0 0 ${width} 32`} preserveAspectRatio="none" aria-hidden="true"><path d={`M ${lens.left} 0 L ${visibleRange.start * width / 100} 26 M ${lens.right} 0 L ${visibleRange.end * width / 100} 26`} /></svg>{/if}
    <div class="date-rail"><span style={`left: ${visibleRange.start}%; width: ${visibleRange.end - visibleRange.start}%`}></span></div>
  </div>
  <div class="overview-dates"><span>{entries[0] ? dateLabel(entries[0]) : ''}</span><span>{formatDate(entries[entries.length - 1]?.date)}</span></div>
</div>

<style>
  .overview { padding: 0 10px; }
  .focus-dates { display: flex; justify-content: center; align-content: center; flex-wrap: wrap; gap: 3px 5px; height: 40px; padding: 3px 0; line-height: 1.3; text-align: center; font-size: 11px; color: #445048; font-variant-numeric: tabular-nums; }
  .overview-track { height: 86px; position: relative; }
  .rail { position: absolute; top: 30px; left: 0; right: 0; height: 3px; background: var(--line-color); border-radius: 2px; }
  button { position: absolute; top: 31px; width: 24px; height: 26px; padding: 0; translate: -50% -50%; display: grid; place-items: center; border: 0; background: #f4f6f1; color: var(--event-color); z-index: 2; cursor: pointer; }
  button.cluster { width: 34px; font-size: 12px; font-weight: 650; font-variant-numeric: tabular-nums; border-bottom: 1px dotted #687267; }
  @media(max-width: 700px), (pointer: coarse) { button { height: 44px; min-width: 28px; } }
  button.focused { background: #fffdfa; }
  button.train :global(svg) { background: #f4f6f1; border-radius: 2px; }
  button:hover, button:focus-visible { z-index: 4; outline: 2px solid var(--event-color); outline-offset: 2px; border-radius: 3px; background: #fffdfa; }
  .milestone-dot { width: 9px; height: 9px; border-radius: 50%; background: #17211d; }
  .viewport-box { position: absolute; top: 8px; height: 47px; border: 1px solid #687267; border-radius: 4px; background: #fffdfa; pointer-events: none; }
  .viewport-box::after { content: ''; position: absolute; top: 21px; left: 0; right: 0; height: 3px; background: var(--line-color); }
  .scale-connectors { position: absolute; top: 55px; left: 0; width: 100%; height: 32px; pointer-events: none; }
  .scale-connectors path { fill: none; stroke: #a1aaa0; stroke-width: 1; stroke-dasharray: 3 3; }
  .date-rail { position: absolute; bottom: 4px; left: 0; right: 0; height: 2px; background: #d8ded4; }
  .date-rail span { position: absolute; min-width: 2px; height: 4px; top: -1px; background: #536055; }
  .overview-dates { display: flex; justify-content: space-between; gap: 12px; font-size: 11px; color: #536055; font-variant-numeric: tabular-nums; }
</style>
