<script lang="ts">
  import { lineColors, lineShortLabels } from '$lib/data/presentation';
  import type { BoardRow } from '$lib/data/stats';

  let { rows }: { rows: BoardRow[] } = $props();
  const clean = (s: string) => s.replace(/ \(.*\)$/, '');
</script>

<div class="board" role="table" aria-label="Sections not open yet: first promised date, current date and how often it moved">
  <div class="bh" role="row"><span role="columnheader" aria-label="Line"></span><span role="columnheader">Section</span><span role="columnheader">First promise</span><span role="columnheader">Now</span><span role="columnheader">Moved</span></div>
  {#each rows as r}
    <div class="br" role="row" style={`--c: ${lineColors[r.line]}`}>
      <span role="cell" class="dot" aria-label={`${lineShortLabels[r.line]} Line`}></span>
      <span role="cell" class="sec" title={r.section}>{r.section}</span>
      <span role="cell"><s>{clean(r.first)}</s></span>
      <span role="cell">{#if r.now}{clean(r.now)}{:else}<span class="none">No date</span>{/if}</span>
      <span role="cell" class="moved">{r.moved}×</span>
    </div>
  {/each}
</div>

<style>
  .board { border-radius: 12px; background: #0d1110; padding: 10px 12px; font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace; color: #ffb547; box-shadow: inset 0 0 0 1px #ffffff12; text-transform: uppercase; }
  .bh, .br { display: grid; grid-template-columns: 10px minmax(0, 1.6fr) minmax(0, 0.9fr) minmax(0, 0.9fr) 48px; gap: 10px; align-items: center; padding: 7px 0; }
  .bh { font-size: 10px; letter-spacing: 0.12em; color: #a07a35; border-bottom: 1px dashed #ffb54733; }
  .br { font-size: 13px; border-bottom: 1px solid #ffffff0a; }
  .br:last-child { border-bottom: 0; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--c); }
  .sec { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #ffd99a; }
  s { color: #a07a35; text-decoration-color: #ff6b4a; text-decoration-thickness: 1.5px; }
  .none { color: #a07a35; }
  .moved { font-weight: 700; color: #ff6b4a; text-align: right; }
  @media (max-width: 520px) {
    .bh, .br { grid-template-columns: 8px minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 0.8fr) 30px; gap: 8px; }
    .br { font-size: 11px; }
  }
</style>
