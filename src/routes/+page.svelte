<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { formatDate, todayIsoDate } from '$lib/data/date';
  import { lineColors, lineDesigns, lineLabels, lineOrder, trainDesignLabels } from '$lib/data/presentation';
  import NetworkMap from '$lib/components/NetworkMap.svelte';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import { decorateTrainsetForDate, resolvedTrainsets } from '$lib/data/resolve';
  import { pendingOn, trackedContractsLabel, untrackedFleet } from '$lib/data/coverage';
  import { lines } from '$lib/data/lines';
  import { buildDelayStory, monthsBetween } from '$lib/data/delay-story';

  const today = todayIsoDate();
  const fleet = resolvedTrainsets.map((t) => decorateTrainsetForDate(t, today));
  const count = (id: string) => fleet.filter((t) => t.currentStage.id === id).length;
  const stats = [
    { label: 'In service', value: count('service') + untrackedFleet.trainsets, color: 'var(--service)', note: `${count('service')} tracked + ${untrackedFleet.trainsets} older` },
    { label: 'Delivered, testing', value: count('testing'), color: 'var(--testing)' },
    { label: 'In transit', value: count('dispatch'), color: 'var(--dispatch-ink)' },
    { label: 'Ordered, pending', value: pendingOn(today), color: 'var(--muted)' }
  ];
  const board = lineOrder
    .map((line) => ({ line, trains: fleet.filter((t) => t.displayLine === line) }))
    .filter((row) => row.trains.length);
  const yellow = buildDelayStory('yellow', lines.yellow?.milestones ?? [], today);
  const lateBy = yellow?.opening && yellow.earliest ? monthsBetween(yellow.earliest.target, yellow.opening.date) : null;
  const civil = yellow?.spans.find((s) => s.label.startsWith('Civil'));
</script>

<svelte:head>
  <title>Namma Metro Trainset Tracker</title>
  <meta name="description" content="Source-backed record of Namma Metro trainsets, line milestones and the network they serve." />
</svelte:head>

<main>
  <section class="hero" aria-labelledby="home-title">
    <div class="intro">
      <div class="title-grid">
        <h1 id="home-title"><span>Namma Metro</span> <span>Trainset Tracker</span></h1>
        <div class="hero-map"><NetworkMap caption={false} weight={3} /></div>
        <p class="lede">[Your one-line description of the project]</p>
        <!-- Parked side by side, like trains on stabling lines. -->
        <ul class="hero-trains" aria-label="Train designs on Namma Metro">
          {#each ['beml-og', 'crrc-trsl', 'beml-new'] as const as design}
            <li><TrainIcon {design} variant="solid" size={48} label={trainDesignLabels[design]} /></li>
          {/each}
        </ul>
      </div>
      <div class="actions">
        <a class="action-link" href="/fleet">See the fleet <ArrowRight size={18} /></a>
        <a class="secondary-link" href="/timeline/yellow">Yellow Line timeline</a>
      </div>
      <p class="as-of tnum">Data as of {formatDate(today)} · {resolvedTrainsets.length} trainsets · {trackedContractsLabel} contracts</p>
    </div>

    <a class="today-panel" href="/fleet" aria-label="Fleet today. Open the fleet page">
      <div class="panel-head"><h2>Fleet today</h2><span class="tnum">{formatDate(today)}</span></div>
      <dl class="stats">
        {#each stats as stat}
          <div><dt>{stat.label}{#if stat.note}<small class="tnum">{stat.note}</small>{/if}</dt><dd class="tnum" style={`color: ${stat.color}`}>{stat.value}</dd></div>
        {/each}
      </dl>
      <div class="board">
        {#each board as row (row.line)}
          <div class="board-row">
            <span class="board-line"><span class="dot" style={`--dot: ${lineColors[row.line]}`}></span>{(lineLabels[row.line] ?? row.line).replace(' Line', '')}<span class="row-icons">{#each lineDesigns[row.line] ?? [] as design}<TrainIcon {design} size={16} />{/each}</span></span>
            <span class="pills">{#each row.trains as t (t.id)}<span class="pill {t.currentStage.id}" title={`${t.trainsetNumber} · ${t.currentStage.label}`}></span>{/each}</span>
            <span class="board-count tnum">{row.trains.length}</span>
          </div>
        {/each}
        <div class="board-row untracked">
          <span class="board-line"><span class="dot" style={`--dot: ${lineColors.purple}`}></span><span class="dot" style={`--dot: ${lineColors.green}`}></span>Older<span class="row-icons"><TrainIcon design="beml-og" size={16} /></span></span>
          <span class="pills">{#each Array(untrackedFleet.trainsets) as _}<span class="pill ghost"></span>{/each}</span>
          <span class="board-count tnum">{untrackedFleet.trainsets}</span>
        </div>
      </div>
      <p class="panel-foot">The {untrackedFleet.trainsets} older {untrackedFleet.contracts} trains on Purple and Green are in service but not tracked individually.</p>
      <ul class="legend" aria-hidden="true">
        <li><span class="pill service"></span>In service</li>
        <li><span class="pill testing"></span>Testing</li>
        <li><span class="pill dispatch"></span>In transit</li>
        <li><span class="pill ghost"></span>In service, not tracked</li>
      </ul>
    </a>
  </section>

  {#if yellow && lateBy !== null}
    <section class="story-wrap">
      <a class="story" href="/timeline/yellow">
        <div class="story-text">
          <p class="kicker"><span class="dot" style={`--dot: ${lineColors.yellow}`}></span>Yellow Line</p>
          <h2>Opened {lateBy} months after the first recorded target.</h2>
          <p class="tnum">{yellow.missed} of {yellow.targets.length} reported opening targets missed.{#if civil}{' '}{civil.months} months between civil work being reported complete and the first passengers.{/if}</p>
          <span class="story-link">Walk through the timeline <ArrowRight size={16} /></span>
        </div>
        <ol class="ladder" aria-label="Reported opening targets in order">
          {#each yellow.targets as target}
            <li class={target.outcome}><span class="target tnum">{target.label}</span><span class="outcome tnum">{target.outcome === 'missed' ? `+${target.monthsLate} mo` : target.outcome === 'not-taken' ? 'option' : target.outcome}</span></li>
          {/each}
          <li class="opened"><span class="target tnum">Opened {formatDate(yellow.opening!.date)}</span></li>
        </ol>
      </a>
    </section>
  {/if}

  <section class="explore" aria-label="Explore">
    <a href="/fleet"><span class="num">01</span><strong>Fleet</strong><span>Every tracked trainset, its status on any date, and the sources behind it.</span></a>
    <a href="/lifecycle"><span class="num">02</span><strong>Lifecycle</strong><span>Dispatch, testing and service for every tracked train on one chart.</span></a>
    <a href="/routemap"><span class="num">03</span><strong>Route Map</strong><span>The Namma Metro network, redrawn with planned lines added.</span></a>
  </section>

  <section class="about">
    <div>
      <h2>About</h2>
      <p>[Your About copy]</p>
    </div>
    <div>
      <h2>Acknowledgements</h2>
      <p>[Your acknowledgements]</p>
    </div>
  </section>
</main>

<style>
  .hero { max-width: 1240px; margin: 0 auto; padding: 64px 32px 48px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 480px); gap: 56px; align-items: center; }
  .intro { display: flex; flex-direction: column; gap: 20px; }
  /* | title | map |  then  | description | trains | */
  .title-grid { display: grid; grid-template-columns: auto var(--map-w); column-gap: 32px; row-gap: 18px; align-items: end; width: fit-content; --map-w: clamp(110px, 11vw, 160px); }
  .hero-map { width: var(--map-w); }
  .hero-map :global(figure) { margin: 0; }
  .hero-trains { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; align-self: center; color: var(--ink); }
  .hero-trains li { aspect-ratio: 1; }
  .hero-trains :global(.train-icon) { width: 100% !important; height: 100% !important; }
  h1 > span { display: block; white-space: nowrap; }
  h1 { margin: 0; font-family: var(--font-display); font-size: clamp(40px, 4.2vw, 60px); line-height: 1; letter-spacing: -0.035em; font-weight: 800; }
  .lede { margin: 0; align-self: center; font-size: 18px; line-height: 1.55; color: var(--ink-3); max-width: 460px; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .as-of { margin: 4px 0 0; font-size: 12px; color: var(--muted); }

  .today-panel { display: flex; flex-direction: column; gap: 18px; padding: 24px 26px 20px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); text-decoration: none; transition: border-color 120ms ease; }
  .today-panel:hover { border-color: var(--faint); }
  .panel-head { display: flex; justify-content: space-between; align-items: baseline; }
  .panel-head h2 { margin: 0; font-size: 15px; }
  .panel-head span { font-size: 12px; color: var(--muted); }
  .stats { margin: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .stats dt { order: 2; font-size: 12px; color: var(--ink-3); margin-top: 6px; }
  .stats dt small { display: block; margin-top: 2px; font-size: 11px; color: var(--muted); }
  .stats div { display: flex; flex-direction: column; }
  .stats dd { order: 1; margin: 0; font-family: var(--font-display); font-size: 38px; font-weight: 800; line-height: 1; }
  .board { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px solid var(--border-soft); }
  .row-icons { display: inline-flex; gap: 2px; margin-left: auto; color: var(--ink-3); }
  .board-row { display: grid; grid-template-columns: 116px minmax(0, 1fr) 28px; gap: 10px; align-items: center; }
  .board-line { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
  .untracked .board-line { color: var(--muted); }
  .untracked .board-line .dot + .dot { margin-left: -9px; }
  .board-count { font-size: 12px; color: var(--muted); text-align: right; }
  /* 8×16 with 4px gaps: whole device pixels at 100/125/150/175/200% scaling, so every mark renders the same size. */
  .pills { display: flex; flex-wrap: wrap; gap: 4px; }
  .pill { display: inline-block; flex: none; width: 8px; height: 16px; border-radius: 2px; background: #dfe4db; }
  .pill.service { background: var(--service); }
  .pill.testing { background: var(--testing); }
  .pill.dispatch { background: var(--dispatch); }
  .pill.ghost { background: color-mix(in srgb, var(--service) 14%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--service) 55%, transparent); }
  .panel-foot { margin: 0; font-size: 12px; line-height: 1.5; color: var(--muted); }
  .legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 11px; color: var(--muted); }
  .legend li { display: flex; align-items: center; gap: 6px; }
  .legend .pill { width: 8px; height: 12px; }
  .board-row { align-items: start; }
  .board-line, .board-count { line-height: 16px; }

  .story-wrap { max-width: 1240px; margin: 0 auto; padding: 0 32px 56px; }
  .story { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 360px); gap: 48px; padding: 40px 44px; border-radius: 16px; background: var(--ink); color: var(--surface); text-decoration: none; }
  .story-text { display: flex; flex-direction: column; gap: 14px; }
  .kicker { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #e9c75a; }
  .story h2 { margin: 0; font-family: var(--font-display); font-size: clamp(28px, 3.4vw, 40px); line-height: 1.1; letter-spacing: -0.02em; font-weight: 800; }
  .story-text p:not(.kicker) { margin: 0; font-size: 15px; line-height: 1.6; color: #c9d0c5; }
  .story-link { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; margin-top: 4px; }
  .ladder { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; align-self: center; }
  .ladder li { display: flex; justify-content: space-between; gap: 12px; padding: 5px 10px; border-radius: 6px; font-size: 13px; background: #ffffff0d; }
  .ladder .missed .target { text-decoration: line-through; text-decoration-color: #e0705a; color: #c9d0c5; }
  .ladder .outcome { font-weight: 700; font-size: 12px; }
  .ladder .missed .outcome { color: #f09a85; }
  .ladder .met .outcome, .ladder .held .outcome { color: #7fd1a2; }
  .ladder .not-taken .outcome { color: #8a928a; }
  .ladder .opened { background: #d7a719; color: var(--ink); font-weight: 700; }

  .explore { max-width: 1240px; margin: 0 auto; padding: 0 32px 64px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
  .explore a { display: flex; flex-direction: column; gap: 8px; padding: 24px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); text-decoration: none; }
  .explore a:hover { border-color: var(--faint); }
  .explore .num { font-size: 12px; color: var(--muted); }
  .explore strong { font-size: 20px; }
  .explore span:last-child { font-size: 14px; line-height: 1.5; color: var(--ink-3); }

  .about { border-top: 1px solid var(--border); background: var(--surface); display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 64px; padding: 56px max(32px, calc((100% - 1176px) / 2)) 64px; }
  .about h2 { margin: 0 0 14px; font-family: var(--font-display); font-size: 30px; letter-spacing: -0.02em; }
  .about p { margin: 0; font-size: 16px; line-height: 1.75; color: var(--ink-3); }

  @media (max-width: 960px) {
    h1 { font-size: clamp(40px, 8vw, 64px); }
    .title-grid { --map-w: clamp(96px, 24vw, 170px); column-gap: 20px; }
    .hero { grid-template-columns: 1fr; gap: 32px; padding: 40px 20px 32px; }
    .story { grid-template-columns: 1fr; padding: 28px 24px; gap: 24px; }
    .story-wrap, .explore { padding-left: 16px; padding-right: 16px; }
    .explore { grid-template-columns: 1fr; }
    .about { grid-template-columns: 1fr; gap: 32px; padding: 40px 20px 48px; }
  }
  @media (max-width: 520px) {
    h1 > span { white-space: normal; }
    .today-panel { padding: 20px 18px 18px; }
    .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 16px; }
    .board-row { grid-template-columns: 96px minmax(0, 1fr) 24px; }
    .actions a { flex: 1; }
  }
</style>
