<script lang="ts">
  import { lineColors, lineShortLabels } from '$lib/data/presentation';
  import type { NoticePoint } from '$lib/data/stats';

  let { points, worse }: { points: NoticePoint[]; worse: number } = $props();
  // Both axes use the same months-per-pixel, so the diagonal is a true 45° "late by exactly the notice" line.
  const p = { l: 50, r: 14, t: 16, b: 46 };
  const side = 496;
  const W = p.l + side + p.r, H = p.t + side + p.b;
  let max = $derived(Math.ceil((Math.max(...points.map((n) => Math.max(n.ahead, n.late))) + 2) / 6) * 6);
  const x = (v: number) => p.l + (v / max) * side;
  const y = (v: number) => p.t + side - (v / max) * side;
  let ticks = $derived(Array.from({ length: max / 12 + 1 }, (_, i) => i * 12));
  // Points sharing a value are nudged sideways so each one stays visible.
  let dots = $derived.by(() => {
    const seen: Record<string, number> = {};
    return points.map((n) => { const k = `${n.ahead}-${n.late}`; seen[k] = (seen[k] ?? 0) + 1; return { ...n, dx: (seen[k] - 1) * 6 }; });
  });
  let lines = $derived([...new Set(points.map((n) => n.line))]);
</script>

<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${worse} of ${points.length} missed opening dates were late by more than the notice given`}>
  <polygon points={`${x(0)},${y(0)} ${x(max)},${y(max)} ${x(0)},${y(max)}`} fill="#c8553d14" />
  {#each ticks as t}
    <line x1={p.l} x2={p.l + side} y1={y(t)} y2={y(t)} stroke="#17211d10" />
    <line x1={x(t)} x2={x(t)} y1={p.t} y2={p.t + side} stroke="#17211d10" />
    <text x={p.l - 8} y={y(t) + 3} font-size="11" text-anchor="end" fill="var(--muted)">{t}</text>
    <text x={x(t)} y={p.t + side + 16} font-size="11" text-anchor="middle" fill="var(--muted)">{t}</text>
  {/each}
  <line x1={x(0)} y1={y(0)} x2={x(max)} y2={y(max)} stroke="var(--slow)" stroke-dasharray="5 4" />
  <text x={x(1.5)} y={y(max) + 22} font-size="13" font-weight="700" fill="var(--slow)">Late by more than the notice: {worse}</text>
  <text x={x(max) - 6} y={y(2)} font-size="13" font-weight="600" text-anchor="end" fill="var(--muted)">Late by less than the notice: {points.length - worse}</text>
  <text x={p.l + side / 2} y={H - 8} font-size="12.5" text-anchor="middle" fill="var(--ink-3)">Months b/w announcement → promised date</text>
  <text transform={`translate(14 ${p.t + side / 2}) rotate(-90)`} font-size="12.5" text-anchor="middle" fill="var(--ink-3)">Months b/w promised date → real opening</text>
  {#each dots as n}
    <circle cx={x(n.ahead) + n.dx} cy={y(n.late)} r="7" fill={lineColors[n.line]} stroke="#fff" stroke-width="1.5"><title>{lineShortLabels[n.line]} · {n.section}: {n.label}. Announced {n.ahead} months ahead, {n.late} months late.</title></circle>
  {/each}
</svg>
<div class="key">{#each lines as l}<span><i style={`--c: ${lineColors[l]}`}></i>{lineShortLabels[l]}</span>{/each}</div>

<style>
  svg { width: 100%; height: auto; display: block; overflow: visible; }
  .key { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; font-size: 11px; color: var(--muted); }
  .key i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; background: var(--c); vertical-align: -1px; }
</style>
