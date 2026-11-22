<script lang="ts">
  import { daysBetween, formatDate } from '$lib/data/date';
  import { stageColors } from '$lib/data/lifecycle';
  import type { HistoryEntry } from '$lib/data/line-timeline';
  import type { DelayStory } from '$lib/data/delay-story';

  let { entries, story, visibleIds, color, compact = false, onJump }: {
    entries: HistoryEntry[]; story: DelayStory | null; visibleIds: string[]; color: string; compact?: boolean; onJump: (id: string) => void;
  } = $props();

  let height = $state(600);
  const width = $derived(compact ? 44 : 168);
  const axis = $derived(compact ? 28 : 62);
  const pad = 14;
  const dateOf = (entry: HistoryEntry) => entry.date ?? `${entry.sortDate}-01`;
  const dated = $derived(entries.map((entry) => ({ entry, date: dateOf(entry) })));
  const start = $derived(dated[0]?.date ?? '2000-01-01');
  const end = $derived(dated.at(-1)?.date ?? start);
  // Two-part scale: years before the first reported opening target are compressed so the
  // promise period gets most of the height. The break is drawn so the scale change stays visible.
  const focusStart = $derived.by(() => {
    const first = story?.targets.find((t) => t.announced)?.announced;
    const candidate = first ? `${first.slice(0, 4)}-01-01` : undefined;
    return candidate && candidate > start && candidate < end ? candidate : undefined;
  });
  const usable = $derived(height - pad * 2);
  const compressed = $derived(focusStart ? usable * (compact ? 0.2 : 0.22) : 0);
  const y = (date: string) => {
    const clamp = date < start ? start : date > end ? end : date;
    if (!focusStart) return pad + (daysBetween(start, clamp) / Math.max(1, daysBetween(start, end))) * usable;
    if (clamp < focusStart) return pad + (daysBetween(start, clamp) / Math.max(1, daysBetween(start, focusStart))) * compressed;
    return pad + compressed + (daysBetween(focusStart, clamp) / Math.max(1, daysBetween(focusStart, end))) * (usable - compressed);
  };

  const years = $derived.by(() => {
    const first = Number(start.slice(0, 4)) + 1;
    const last = Number(end.slice(0, 4));
    const out: number[] = [];
    for (let year = first; year <= last; year++) out.push(year);
    return out;
  });
  // Label a year only when it has room; ticks stay for every year.
  const yearMarks = $derived.by(() => {
    let last = -Infinity;
    const gap = compact ? 26 : 16;
    return years.map((year) => {
      const ty = y(`${year}-01-01`);
      const label = ty - last >= gap;
      if (label) last = ty;
      return { year, ty, label, magnified: !!focusStart && `${year}-01-01` >= focusStart };
    });
  });
  const halfYears = $derived(focusStart ? years.filter((year) => `${year}-07-01` > focusStart! && `${year}-07-01` < end).map((year) => y(`${year}-07-01`)) : []);

  const phaseOf = (entry: HistoryEntry) => {
    const key = entry.groups?.[0]?.milestone.key;
    return key === 'revenue_induction' ? 'service' : key === 'factory_dispatch' || key === 'depot_arrival' ? 'dispatch' : 'testing';
  };

  const windowBox = $derived.by(() => {
    const visible = dated.filter(({ entry }) => visibleIds.includes(entry.id));
    if (!visible.length) return null;
    const top = y(visible[0].date);
    const bottom = y(visible.at(-1)!.date);
    const min = 10;
    const mid = (top + bottom) / 2;
    return bottom - top < min ? { top: mid - min / 2, height: min } : { top, height: bottom - top };
  });

  // Targets dated after the rail's end (still-future underground dates) would pile up at the bottom edge, so they are left off.
  const openings = $derived([...new Map((story?.sections ?? []).flatMap((x) => (x.opening ? [[x.opening.milestoneId, x.opening] as const] : []))).values()].sort((p, q) => p.date.localeCompare(q.date)));
  const onRail = $derived((story?.targets ?? []).filter((t) => t.target <= end));
  const arcs = $derived(onRail.filter((t) => t.announced).map((target) => {
    const y1 = y(target.announced!);
    const y2 = y(target.target);
    const reach = Math.min(width - axis - 6, (compact ? 6 : 12) + Math.abs(y2 - y1) * (compact ? 0.35 : 0.55));
    return { target, y1, y2, d: `M ${axis} ${y1} C ${axis + reach} ${y1}, ${axis + reach} ${y2}, ${axis} ${y2}` };
  }));

  function jumpFromPointer(event: MouseEvent) {
    const svg = event.currentTarget as SVGSVGElement;
    const offset = event.clientY - svg.getBoundingClientRect().top;
    let best = dated[0];
    for (const item of dated) if (Math.abs(y(item.date) - offset) < Math.abs(y(best.date) - offset)) best = item;
    if (best) onJump(best.entry.id);
  }
</script>

<div class="time-rail" class:compact bind:clientHeight={height} style={`--line-color: ${color}`}>
  <!-- Pointer shortcut only; every entry remains reachable in the feed itself. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <svg {width} {height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Date-scaled history from ${formatDate(start)} to ${formatDate(end)}${story ? `, ${story.missed} opening targets missed` : ''}. Click to jump.`} onclick={jumpFromPointer}>
    {#if focusStart}
      {@const by = y(focusStart)}
      <rect class="compressed-band" x={compact ? axis - 8 : axis - 44} width={compact ? width - axis + 6 : width - axis + 40} y={pad - 4} height={Math.max(0, by - pad + 4)} rx="3" />
      <path class="break" d={`M ${axis - 7} ${by - 4} l 4 -3 l 6 6 l 4 -3`} />
      <path class="break" d={`M ${axis - 7} ${by} l 4 -3 l 6 6 l 4 -3`} />
      {#if !compact}<text class="compressed-label" x={width - 4} y={by - 6} text-anchor="end">compressed</text>{/if}
    {/if}
    {#each halfYears as hy}<line class="half-tick" x1={axis - 4} x2={axis} y1={hy} y2={hy} />{/each}
    {#each yearMarks as mark (mark.year)}
      <line class="year-tick" x1={axis - (compact ? 4 : 8)} x2={axis} y1={mark.ty} y2={mark.ty} />
      {#if mark.label}<text class="year" class:magnified={mark.magnified} x={axis - (compact ? 10 : 20)} y={mark.ty + 3.5} text-anchor="end">{compact ? `'${String(mark.year).slice(2)}` : mark.year}</text>{/if}
    {/each}

    {#if windowBox}<rect class="window" x={compact ? axis - 8 : axis - 18} width={compact ? width - axis + 6 : width - axis + 16} y={windowBox.top - 3} height={Math.max(0, windowBox.height + 6)} rx="3" />{/if}

    <line class="axis" x1={axis} x2={axis} y1={pad} y2={height - pad} />

    {#each arcs as arc (`${arc.target.section}-${arc.target.number}`)}
      <path class="arc {arc.target.outcome}" d={arc.d} />
    {/each}
    {#each onRail as target (`${target.section}-${target.number}`)}
      <circle class="target {target.outcome}" cx={axis} cy={y(target.target)} r={compact ? 2.5 : 3.5}><title>Target {target.number}: {target.label} — {target.outcome}</title></circle>
    {/each}

    {#each dated as { entry, date } (entry.id)}
      {#if entry.kind === 'train'}
        <line class="train-tick" x1={axis - (compact ? 6 : 14)} x2={axis - (compact ? 2 : 4)} y1={y(date)} y2={y(date)} style={`stroke: ${stageColors[phaseOf(entry)].color}`} />
      {:else if entry.kind === 'line'}
        <circle class="line-dot" class:visible={visibleIds.includes(entry.id)} cx={axis} cy={y(date)} r={compact ? 2 : 3} />
      {/if}
    {/each}

    <!-- One line per opening (lines that open in stages get several); only the latest is labelled. -->
    {#each openings as opening, i (opening.milestoneId)}
      {@const oy = y(opening.date)}
      <line class="opening" class:earlier={i < openings.length - 1} x1={compact ? axis - 8 : axis - 22} x2={width - 4} y1={oy} y2={oy} />
      {#if !compact && i === openings.length - 1}<text class="opening-label" x={width - 4} y={oy - 5} text-anchor="end">{openings.length > 1 ? 'Latest opening' : 'Opened'}</text>{/if}
    {/each}
    <line class="today" x1={compact ? axis - 8 : axis - 22} x2={width - 4} y1={y(end)} y2={y(end)} />
  </svg>
  {#if !compact && story}
    <ul class="legend" aria-hidden="true">
      <li><span class="swatch missed"></span>Target missed</li>
      <li><span class="swatch met"></span>Target met</li>
      <!-- Each arc runs from the report that set or moved a target to the date it promised. -->
      <li><svg class="arc-swatch" width="10" height="12" viewBox="0 0 10 12"><path d="M1 1 C 9 1, 9 11, 1 11" /></svg>Target shifted</li>
    </ul>
  {/if}
</div>

<style>
  .time-rail { height: 100%; display: flex; flex-direction: column; }
  svg { display: block; flex: 1 1 auto; min-height: 0; cursor: pointer; overflow: visible; }
  .axis { stroke: var(--line-color); stroke-width: 3; stroke-linecap: round; }
  .year-tick { stroke: #a1aaa0; stroke-width: 1; }
  .year { font-size: 10px; fill: #8a928a; font-variant-numeric: tabular-nums; }
  .year.magnified { fill: #26342e; font-weight: 650; }
  .half-tick { stroke: #c4cbc1; stroke-width: 1; }
  .compressed-band { fill: #e9ede6; opacity: 0.7; }
  .break { fill: none; stroke: #687267; stroke-width: 1.2; }
  .compressed-label { font-size: 9.5px; fill: #8a928a; font-style: italic; }
  .compact .year { font-size: 8.5px; }
  .window { fill: color-mix(in srgb, var(--line-color) 9%, transparent); stroke: #17211d; stroke-width: 1; transition: y 0.15s ease, height 0.15s ease; }
  .arc { fill: none; stroke-width: 1.4; }
  .arc.missed, .arc.not-taken { stroke: #b4452f; opacity: 0.7; }
  .arc.not-taken { stroke-dasharray: 3 3; }
  .arc.met, .arc.held { stroke: #15884d; }
  .target { fill: #fffdfa; stroke-width: 1.6; }
  .target.missed, .target.not-taken { stroke: #b4452f; }
  .target.met, .target.held { stroke: #15884d; fill: #15884d; }
  .target.pending { stroke: #2f7fbd; }
  /* Underground-style targets not yet due: replaced by a later report, or still current. */
  .arc.superseded, .arc.pending { stroke: #8a928a; stroke-dasharray: 3 3; opacity: 0.8; }
  .arc.pending { stroke: #2f7fbd; }
  .target.superseded { stroke: #8a928a; }
  .train-tick { stroke-width: 2; opacity: 0.85; }
  .line-dot { fill: #17211d; stroke: #fffdfa; stroke-width: 1; }
  .line-dot.visible { r: 4.5; }
  .compact .line-dot.visible { r: 3; }
  .opening { stroke: #17211d; stroke-width: 2; }
  .opening.earlier { stroke-width: 1.2; stroke-dasharray: 4 3; }
  .opening-label { font-size: 10px; font-weight: 700; fill: #17211d; }
  .today { stroke: #17211d; stroke-width: 1; stroke-dasharray: 2 3; }
  .legend { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; font-size: 10.5px; color: #536055; }
  .legend li { display: flex; align-items: center; gap: 6px; }
  .swatch { width: 8px; height: 8px; border-radius: 50%; border: 1.6px solid; }
  .swatch.missed { border-color: #b4452f; }
  .swatch.met { border-color: #15884d; background: #15884d; }
  .arc-swatch { flex: none; overflow: visible; }
  .arc-swatch path { fill: none; stroke: #8a928a; stroke-width: 1.4; }
  @media (prefers-reduced-motion: reduce) { .window { transition: none; } }
</style>
