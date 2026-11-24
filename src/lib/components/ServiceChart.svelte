<script lang="ts">
  // Trains delivered / in passenger service over time, stacked by line.
  // Delivered counts recorded depot arrivals (complete trainset at depot); service counts revenue inductions.
  // Both modes share one vertical scale (all tracked trains), so switching shows the gap between them.
  import { formatDate, percentageBetween } from '$lib/data/date';
  import { lineColors, lineLabels, lineOrder } from '$lib/data/presentation';
  import { buildServiceBands } from '$lib/data/service-chart';
  import type { DateBounds, ResolvedTrainset } from '$lib/data/types';

  let { trainsets, bounds, selectedDate, ordered, sharedPools = [] }: { trainsets: ResolvedTrainset[]; bounds: DateBounds; selectedDate: string; ordered?: number; sharedPools?: string[] } = $props();
  let outOf = $derived(ordered === undefined ? 'unknown' : ordered);
  const poolLabel = (pool: string) => pool.split('/').map((line) => (lineLabels[line] ?? line).replace(/ Line$/, '')).join('/');

  const H = 100;
  const modes = {
    delivered: { key: 'depot_arrival', label: 'Delivered', first: 'First delivered', aria: 'delivered to depot' },
    service: { key: 'revenue_induction', label: 'In service', first: 'First inducted', aria: 'in passenger service' }
  } as const;
  let mode = $state<keyof typeof modes>('delivered');
  let m = $derived(modes[mode]);
  let inductions = $derived(trainsets.flatMap((t) => {
    const m = t.milestones.find((x) => x.key === modes[mode].key && x.date <= bounds.end);
    return m ? [{ date: m.date, line: t.displayLine }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date)));
  let lines = $derived(lineOrder.filter((line) => inductions.some((i) => i.line === line)));
  let total = $derived(inductions.length);
  let atDate = $derived(inductions.filter((i) => i.date <= selectedDate).length);
  let firstDate = $derived(inductions[0]?.date);
  let x = (date: string) => percentageBetween(date, bounds.start, bounds.end) * 10;

  let bands = $derived(buildServiceBands(inductions, lines, trainsets.length, bounds));
</script>

<section class="service-chart" aria-label={`Trains ${m.aria} over time`}>
  <div class="figure">
    <div class="switch" role="group" aria-label="Chart measure">
      {#each Object.entries(modes) as [id, def]}
        <button type="button" aria-pressed={mode === id} onclick={() => (mode = id as keyof typeof modes)}>{def.label}</button>
      {/each}
    </div>
    <span class="label">{m.label} on {formatDate(selectedDate)}</span>
    <strong class="tnum">{atDate}<span class="of">{ordered === undefined ? ' ordered total unavailable' : ` of ${ordered} ordered`}</span></strong>
    {#each sharedPools as pool}<span class="sub">Includes the shared {poolLabel(pool)} order.</span>{/each}
    {#if firstDate}<span class="sub tnum">{m.first} {formatDate(firstDate)}</span>{/if}
    <ul class="legend">
      {#each lines as line}<li><span class="dot" style={`--dot: ${lineColors[line]}`}></span>{lineLabels[line] ?? line}</li>{/each}
    </ul>
  </div>
  <svg viewBox={`0 0 1000 ${H}`} preserveAspectRatio="none" role="img" aria-label={`Stacked step chart of tracked trains ${m.aria} by line, reaching ${total} of ${outOf} by ${formatDate(bounds.end)}`}>
    {#each bands as band (band.line)}<path d={band.d} fill={lineColors[band.line] ?? '#6f786f'} fill-opacity="0.85"></path>{/each}
    <line x1={x(selectedDate)} x2={x(selectedDate)} y1="0" y2={H} stroke="#17211d" stroke-width="1.5" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"></line>
  </svg>
</section>

<style>
  .service-chart { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 20px; align-items: stretch; padding: 16px 20px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); }
  .figure { display: flex; flex-direction: column; gap: 4px; }
  .label, .sub { font-size: 12px; color: var(--muted); }
  .switch { display: inline-flex; align-self: flex-start; padding: 2px; margin-bottom: 8px; border-radius: 8px; background: var(--hover); }
  .switch button { height: 28px; padding: 0 10px; border: 0; border-radius: 6px; background: transparent; font-size: 12px; color: var(--ink-3); }
  .switch button[aria-pressed='true'] { background: var(--surface); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px #17211d1f; }
  .of { margin-left: 4px; font-family: var(--font-body); font-size: 14px; font-weight: 500; color: var(--muted); }
  strong { font-family: var(--font-display); font-size: 40px; font-weight: 800; line-height: 1; }
  .legend { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 11px; color: var(--ink-3); }
  .legend li { display: flex; align-items: center; gap: 5px; }
  svg { width: 100%; height: 110px; align-self: end; border-bottom: 1px solid var(--border); }
  @media (max-width: 860px) { .service-chart { grid-template-columns: 1fr; } svg { height: 80px; } }
</style>
