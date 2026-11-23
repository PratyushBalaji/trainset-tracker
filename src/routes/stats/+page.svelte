<script lang="ts">
  import { formatDate, todayIsoDate } from '$lib/data/date';
  import { buildStats } from '$lib/data/stats';
  import StatTile from '$lib/components/stats/StatTile.svelte';

  const stats = buildStats(todayIsoDate());
</script>

<svelte:head>
  <title>Stats · Namma Metro Trainset Tracker</title>
  <meta name="description" content="Namma Metro's trains and opening dates in numbers: deliveries, depot waits and missed dates, all worked out from sourced records." />
</svelte:head>

<main class="stats-page">
  <header class="page-head">
    <h1>Namma Metro,<br />in numbers.</h1>
    <p>How long the trains took to get here, how long they waited, and what was promised along the way. Every number comes from the dated, sourced records on this site.</p>
    <p class="asof tnum">Data as of <b>{formatDate(stats.today)}</b></p>
  </header>

  <nav class="topics" aria-label="Topics">
    {#each stats.chapters as chapter, i}<a href={`#${chapter.id}`}><span>{i + 1}</span>{chapter.short}</a>{/each}
  </nav>

  {#each stats.chapters as chapter, i (chapter.id)}
    <section class="chapter" id={chapter.id} aria-labelledby={`${chapter.id}-title`}>
      <div class="ch-head">
        <span class="ch-num" aria-hidden="true">{i + 1}</span>
        <div>
          <p class="eyebrow">{chapter.short}</p>
          <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
          <p class="summary">{chapter.summary}</p>
        </div>
      </div>
      <div class="grid">{#each chapter.tiles as tile (tile.id)}<StatTile {tile} />{/each}</div>
    </section>
  {/each}

  <section class="method" aria-label="How these numbers are made">
    <div><h2>Where the numbers come from</h2><p>The train dates, contracts and line records on this site, each with its sources. Nothing here is typed in by hand; it updates when the data does.</p></div>
    <div><h2>What counts as missed</h2><p>An opening date is missed when the line opened after it. A date replaced before it arrived counts as moved, not missed.</p></div>
    <div><h2>Which dates count</h2><p>Times like "factory to depot" use reported dates only. Dates the site marks as inferred or approximate are left out here.</p></div>
  </section>
</main>

<style>
  .stats-page { max-width: 1240px; margin: 0 auto; padding: 48px 32px 96px; }
  .page-head h1 { margin: 0; font-family: var(--font-display); font-size: clamp(44px, 7vw, 88px); line-height: 0.94; letter-spacing: -0.045em; font-weight: 800; }
  .page-head p { margin: 16px 0 0; max-width: 620px; color: var(--ink-3); font-size: 17px; line-height: 1.55; }
  .page-head .asof { margin-top: 10px; font-size: 13px; color: var(--muted); }
  .asof b { color: var(--ink); }

  .topics { position: sticky; top: 64px; z-index: 5; display: flex; gap: 8px; margin: 28px -32px 0; padding: 10px 32px; background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(6px); overflow-x: auto; scrollbar-width: none; }
  .topics a { display: inline-flex; align-items: center; gap: 8px; flex: none; height: 36px; padding: 0 14px 0 6px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--ink); text-decoration: none; font-size: 13px; font-weight: 600; }
  .topics a:hover { border-color: var(--ink-3); }
  .topics a span { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--ink); color: var(--surface); font-size: 11px; }

  .chapter { margin-top: 64px; scroll-margin-top: 130px; }
  .ch-head { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 18px; align-items: start; }
  .ch-num { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 50%; background: var(--ink); color: var(--surface); font: 800 21px var(--font-display); }
  .eyebrow { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted); }
  .ch-head h2 { margin: 2px 0 0; font: 800 clamp(28px, 3.6vw, 42px)/1.05 var(--font-display); letter-spacing: -0.03em; }
  .summary { margin: 10px 0 0; max-width: 62ch; color: var(--ink-3); font-size: 16px; line-height: 1.5; }
  .grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; margin-top: 24px; }

  .method { margin-top: 84px; padding: 24px; border-radius: 18px; background: #e7ebe2; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; font-size: 13px; color: var(--ink-3); }
  .method h2 { margin: 0 0 6px; font-size: 14px; color: var(--ink); }
  .method p { margin: 0; line-height: 1.5; }

  @media (max-width: 980px) {
    .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .method { grid-template-columns: 1fr; }
  }
  @media (max-width: 760px) { .topics { top: 0; } }
  @media (max-width: 520px) {
    .stats-page { padding: 28px 16px 64px; }
    .topics { margin: 20px -16px 0; padding: 10px 16px; }
    .grid { grid-template-columns: minmax(0, 1fr); }
    .grid :global(.tile) { grid-column: auto; }
    .ch-num { width: 42px; height: 42px; font-size: 17px; }
  }
</style>
