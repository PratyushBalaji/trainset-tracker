<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snapshot } from '@sveltejs/kit';
  import { ArrowDownToLine, ArrowUpToLine } from '@lucide/svelte';
  import type { PageData } from './$types';
  import LineTimeline from '$lib/components/LineTimeline.svelte';
  import NetworkMap from '$lib/components/NetworkMap.svelte';
  import TimeRail from '$lib/components/TimeRail.svelte';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import { lineColors, lineDesigns, lineLabels, lineOrder, trainDesignLabels } from '$lib/data/presentation';
  import { resolvedTrainsets } from '$lib/data/resolve';
  import { formatDate, todayIsoDate } from '$lib/data/date';
  import { buildLineTimeline } from '$lib/data/line-timeline';
  import { buildDelayStory, monthsBetween, timelineGaps } from '$lib/data/delay-story';

  let { data }: { data: PageData } = $props();
  export const snapshot: Snapshot<string[]> = {
    capture: () => [...document.querySelectorAll<HTMLDetailsElement>('.event-details[open]')].map((el) => el.closest('li')!.id),
    restore: (ids) => { for (const id of ids) { const el = document.getElementById(id)?.querySelector('details'); if (el) el.open = true; } }
  };
  const today = todayIsoDate();
  let entries = $derived(buildLineTimeline(data.line.milestones, resolvedTrainsets, data.lineId, today));
  let story = $derived(buildDelayStory(data.lineId, data.line.milestones, today));
  let gaps = $derived(timelineGaps(entries));
  let atTop = $state(true);
  let atCurrent = $state(false);
  let visibleIds = $state<string[]>([]);
  let dock: HTMLDivElement;
  let dockHeight = $state(60);
  let pinned = $state(false);
  let hasHistory = $derived(entries.some((entry) => entry.kind !== 'today'));
  let color = $derived(lineColors[data.lineId]);

  function jumpTo(id: string) {
    const target = document.getElementById(id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  onMount(() => {
    const header = document.querySelector('.site-header');
    let measuredEntries: typeof entries | undefined;
    let elements: (HTMLElement | null)[] = [];
    const update = () => {
      if (measuredEntries !== entries) {
        measuredEntries = entries;
        elements = entries.map((entry) => document.getElementById(entry.id));
      }
      atTop = window.scrollY < 180;
      const marker = document.getElementById('current-date')?.getBoundingClientRect();
      atCurrent = !!marker && marker.top >= 0 && marker.top < window.innerHeight;
      const dockRect = dock.getBoundingClientRect();
      const guide = dockRect.bottom + 8;
      pinned = dockRect.top <= (header?.getBoundingClientRect().height ?? 76) + 1;
      const nextVisible = elements.filter((element) => {
        const rect = element?.getBoundingClientRect();
        return rect && rect.bottom > guide && rect.top < window.innerHeight;
      }).map((element) => element!.id);
      if (nextVisible.length !== visibleIds.length || nextVisible.some((id, i) => id !== visibleIds[i])) visibleIds = nextVisible;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    observer.observe(document.getElementById('line-history')!);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); observer.disconnect(); };
  });
</script>

<svelte:head>
  <title>{data.line.name} Timeline | Namma Metro Trainset Tracker</title>
  <meta name="description" content={`Source-backed ${data.line.name} history, trainset deliveries and passenger-service milestones.`} />
</svelte:head>

<main class="timeline-page" id="line-history" style={`--timeline-dock-height: ${dockHeight}px; --line-color: ${color}`}>
  <div class="timeline-layout" class:with-rail={hasHistory}>
    <aside class="line-sidebar" aria-label="Metro lines and network">
      <h1 class="sidebar-title">Timeline</h1>
      <nav aria-label="Select metro line">
        {#each lineOrder as line}
          <a href={`/timeline/${line}`} aria-current={data.lineId === line ? 'page' : undefined} style={`--line-color: ${lineColors[line]}`}><span class="line-dot"></span>{lineLabels[line]}</a>
        {/each}
      </nav>
      <div class="mini-map"><NetworkMap selectedLine={data.lineId} /><a class="full-map-link" href="/routemap">Full route map</a></div>
      {#if lineDesigns[data.lineId]?.length}
        <div class="line-trains">
          <span class="line-trains-title">Trains on this line</span>
          <ul>
            {#each lineDesigns[data.lineId] as design}
              <li><TrainIcon {design} variant="solid" size={44} color={lineColors[data.lineId]} /><span>{trainDesignLabels[design]}</span></li>
            {/each}
          </ul>
        </div>
      {/if}
    </aside>

    <section class="line-content" aria-label={`${data.line.name} history`}>
      <div class="timeline-dock" bind:this={dock} bind:clientHeight={dockHeight}>
        <h2><span class="line-dot"></span>{data.line.name}</h2>
        {#if data.line.scope}<p>{data.line.scope}</p>{/if}
        <div class="timeline-jumps">
          {#if !atTop}<button type="button" aria-label="Go to top" title="Go to top" onclick={() => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}><ArrowUpToLine size={14} /><span>Top</span></button>{/if}
          {#if hasHistory && !atCurrent}<button type="button" aria-label="Go to current date" title="Go to current date" onclick={() => jumpTo('current-date')}><ArrowDownToLine size={14} /><span>Today</span></button>{/if}
        </div>
      </div>

      {#if story?.opening && story.earliest}
        <dl class="scorecard">
          <div class="stat alarm"><dt>Opening targets missed</dt><dd><strong>{story.missed}</strong><span>of {story.targets.length} recorded</span></dd></div>
          <div class="stat"><dt>Late against first recorded target</dt><dd><strong>{monthsBetween(story.earliest.target, story.opening.date)} mo</strong><span>{story.earliest.label} target → opened {formatDate(story.opening.date)}</span></dd></div>
          {#each story.spans as span}
            <div class="stat"><dt>{span.label}</dt><dd><strong>{span.months} mo</strong><span>{formatDate(span.from)} → {formatDate(span.to)}</span></dd></div>
          {/each}
        </dl>
      {/if}

      {#if data.lineId === 'purple'}<p class="coverage-note">Purple Line history is not published yet. Its legacy contracts are outside the current trainset dataset; historical milestones will be added later.</p>
      {:else if data.line.research_status !== 'preliminary'}<p class="coverage-note">Recorded trainset events only. Line-history research is being added.</p>{/if}
      {#if hasHistory}<LineTimeline {entries} {color} {story} {gaps} />{/if}
    </section>

    {#if hasHistory}
      <aside class="rail-column" aria-label="Date-scaled overview">
        <div class="rail-sticky"><TimeRail {entries} {story} {visibleIds} {color} onJump={jumpTo} /></div>
      </aside>
      <div class="rail-mobile" class:shown={pinned} aria-hidden="true"><TimeRail {entries} {story} {visibleIds} {color} compact onJump={jumpTo} /></div>
    {/if}
  </div>
</main>

<style>
  .timeline-page { max-width: 1320px; margin: 0 auto; padding: 28px 32px 48px; }
  .timeline-layout { display: grid; grid-template-columns: 168px minmax(0, 1fr); gap: 40px; }
  .timeline-layout.with-rail { grid-template-columns: 168px minmax(0, 1fr) 176px; }
  .line-sidebar { align-self: start; position: sticky; top: calc(var(--site-header-height) + 20px); }
  .sidebar-title { margin: 0 0 14px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #687267; }
  nav { display: grid; gap: 2px; }
  nav a { display: flex; align-items: center; gap: 9px; padding: 9px 10px; font-size: 13px; border-radius: 6px; text-decoration: none; color: #445048; }
  nav a[aria-current='page'] { background: color-mix(in srgb, var(--line-color) 16%, #fffdfa); color: #17211d; font-weight: 700; box-shadow: inset 3px 0 0 var(--line-color); }
  nav a:hover { background: #eef1eb; }
  .line-dot { display: inline-block; flex: 0 0 auto; width: 9px; height: 9px; background: var(--line-color); border-radius: 50%; }
  .mini-map { margin-top: 22px; }
  .line-trains { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-soft); }
  .line-trains-title { display: block; margin-bottom: 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .line-trains ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 12px 16px; }
  .line-trains li { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 64px; text-align: center; font-size: 11px; line-height: 1.25; color: var(--ink-3); }
  .full-map-link { display: inline-block; margin-top: 8px; font-size: 11px; color: #687267; text-underline-offset: 3px; }
  .line-content { min-width: 0; }

  .timeline-dock { position: sticky; top: var(--site-header-height); z-index: 10; display: flex; align-items: center; flex-wrap: wrap; gap: 4px 14px; padding: 12px 0; margin-bottom: 18px; border-bottom: 1px solid #d8ded4; background: #f4f6f1; }
  .timeline-dock h2 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 24px; line-height: 1.2; }
  .timeline-dock h2 .line-dot { width: 13px; height: 13px; }
  .timeline-dock p { font-size: 12px; color: #687267; margin: 0; }
  .timeline-jumps { display: flex; gap: 6px; margin-left: auto; }
  .timeline-jumps button { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid #d8ded4; border-radius: 6px; background: #fffdfa; font-size: 12px; }
  .timeline-jumps button:hover { border-color: #687267; }

  .scorecard { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin: 0 0 36px; border: 1px solid #d8ded4; border-radius: 8px; overflow: hidden; background: #d8ded4; }
  .stat { padding: 14px 16px 15px; background: #fffdfa; }
  .stat dt { font-size: 11px; color: #687267; margin-bottom: 6px; }
  .stat dd { margin: 0; display: flex; flex-direction: column; gap: 3px; }
  .stat strong { font-size: 28px; line-height: 1; font-weight: 750; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  .stat span { font-size: 11px; color: #687267; line-height: 1.4; }
  .stat.alarm strong { color: #a13b26; }

  .coverage-note { color: #536055; font-size: 13px; line-height: 1.65; margin: 0 0 20px; }

  .rail-column { align-self: stretch; }
  .rail-sticky { position: sticky; top: calc(var(--site-header-height) + 16px); height: calc(100svh - var(--site-header-height) - 40px); padding: 6px 0 4px; }
  .rail-mobile { display: none; }

  @media(max-width: 860px) { .line-trains { grid-column: 1 / -1; margin-top: 4px; } .line-trains li { flex-direction: row; width: auto; } }
  @media(max-width: 1180px) { .scorecard { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media(max-width: 1080px) {
    .timeline-layout.with-rail { grid-template-columns: 150px minmax(0, 1fr) 150px; gap: 28px; }
  }
  @media(max-width: 860px) {
    .timeline-page { padding: 20px 16px 34px; }
    .timeline-layout, .timeline-layout.with-rail { grid-template-columns: 1fr; gap: 20px; }
    .with-rail .line-content { padding-right: 46px; }
    .rail-column { display: none; }
    .rail-mobile.shown { display: block; position: fixed; z-index: 15; right: 0; top: calc(var(--site-header-height) + var(--timeline-dock-height, 60px)); bottom: 0; width: 46px; padding: 4px 0; background: color-mix(in srgb, #f4f6f1 92%, transparent); border-left: 1px solid #d8ded4; }
    .line-sidebar { position: static; display: grid; grid-template-columns: minmax(0, 1fr) 110px; gap: 4px 14px; }
    .sidebar-title { grid-column: 1 / -1; }
    nav { display: flex; flex-wrap: wrap; align-content: start; gap: 4px; }
    nav a { padding: 8px 10px; font-size: 12px; }
    .mini-map { margin: 0; } .mini-map :global(figure) { margin: 0; }
    .timeline-dock { margin-right: -46px; padding-right: 46px; }
    .timeline-dock h2 { font-size: 20px; }
    .timeline-dock p { display: none; }
    .timeline-jumps button { min-height: 36px; }
    .scorecard { grid-template-columns: 1fr 1fr; }
    .stat { padding: 12px; } .stat strong { font-size: 24px; }
  }
</style>
