<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { formatDate, todayIsoDate } from '$lib/data/date';
  import { lineColors, lineLabels, lineOrder, rollingStockDesign, trainDesignLabels } from '$lib/data/presentation';
  import NetworkMap from '$lib/components/NetworkMap.svelte';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import { decorateTrainsetForDate, resolvedTrainsets } from '$lib/data/resolve';
  import { pendingOn, trackedContractsLabel, untrackedFleet } from '$lib/data/coverage';
  import { lines } from '$lib/data/lines';
  import { buildStories } from '$lib/data/stories';
  import StoryCarousel from '$lib/components/StoryCarousel.svelte';
  import ContractsCard from '$lib/components/ContractsCard.svelte';
  import { contractSummaries } from '$lib/data/contracts';

  const today = todayIsoDate();
  const contracts = contractSummaries(today);
  const lastDataUpdate = __TRAINSETS_UPDATED_AT__ ? formatDate(todayIsoDate(new Date(__TRAINSETS_UPDATED_AT__))) : null;
  const fleet = resolvedTrainsets.map((t) => decorateTrainsetForDate(t, today));
  const count = (id: string) => fleet.filter((t) => t.currentStage.id === id).length;
  const stats = [
    { label: 'In service', value: count('service') + untrackedFleet.trainsets, color: 'var(--service)', note: `${count('service')} newly inducted + ${untrackedFleet.trainsets}` },
    { label: 'Undergoing testing', value: count('testing'), color: 'var(--testing)' },
    { label: 'Currently in transit', value: count('dispatch'), color: 'var(--dispatch-ink)' },
    { label: 'Pending delivery', value: pendingOn(today), color: 'var(--muted)' }
  ];
  const board = lineOrder
    .map((line) => {
      const trains = fleet.filter((t) => t.displayLine === line);
      // Only the designs of the tracked trains in this row; older fleets have their own row.
      const designs = [...new Set(trains.map((t) => rollingStockDesign[t.rollingStockId]).filter(Boolean))];
      return { line, trains, designs };
    })
    .filter((row) => row.trains.length);
  const stories = buildStories(today);
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
        <p class="lede">Tracking Namma Metro's trains, from delivery to passenger service.</p>
        <!-- Parked side by side, like trains on stabling lines. -->
        <ul class="hero-trains" aria-label="Train designs on Namma Metro">
          {#each ['beml-og', 'beml-new', 'crrc-trsl'] as const as design}
            <li><TrainIcon {design} variant="solid" size={48} label={trainDesignLabels[design]} /></li>
          {/each}
        </ul>
      </div>
      <div class="actions">
        <a class="action-link" href="/fleet">See the fleet <ArrowRight size={18} /></a>
        <a class="secondary-link" href="/timeline">Line timelines</a>
      </div>
      <p class="as-of tnum">{lastDataUpdate ? `Last data update on ${lastDataUpdate}` : 'Last data update unavailable'} · {resolvedTrainsets.length} trainsets · {trackedContractsLabel} contracts</p>
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
            <span class="board-line"><span class="dot" style={`--dot: ${lineColors[row.line]}`}></span>{(lineLabels[row.line] ?? row.line).replace(' Line', '')}<span class="row-icons">{#each row.designs as design}<TrainIcon {design} size={16} />{/each}</span></span>
            <span class="pills">{#each row.trains as t (t.id)}<span class="pill {t.currentStage.id}" title={`${t.trainsetNumber} · ${t.currentStage.label}`}></span>{/each}</span>
            <span class="board-count tnum">{row.trains.length}</span>
          </div>
        {/each}
        <div class="board-row untracked">
          <span class="board-line"><span class="dot" style={`--dot: ${lineColors.purple}`}></span><span class="dot" style={`--dot: ${lineColors.green}`}></span>Older<span class="row-icons"><TrainIcon design="beml-og" size={16} /></span></span>
          <span class="older-bar">In service, not tracked individually</span>
          <span class="board-count tnum">{untrackedFleet.trainsets}</span>
        </div>
      </div>
      <p class="panel-foot">The older {untrackedFleet.contracts} trains on the Purple and Green lines are not tracked due to insufficient data during their procurement → induction lifecycle.</p>
      <ul class="legend" aria-hidden="true">
        <li><span class="pill service"></span>In service</li>
        <li><span class="pill testing"></span>Testing</li>
        <li><span class="pill dispatch"></span>In transit</li>
      </ul>
    </a>
  </section>

  {#if stories.length}
    <section class="story-wrap"><StoryCarousel {stories} /><a class="more-stats" href="/stats">See more stats <ArrowRight size={16} /></a></section>
  {/if}

  <section class="explore" aria-label="Explore">
    <a href="/fleet"><span class="num">01</span><strong>Fleet</strong><span>Every trainset, its status on any date, and the sources behind it.</span></a>
    <a href="/lifecycle"><span class="num">02</span><strong>Lifecycle</strong><span>The dispatch, testing, and service lifecycle for every tracked train, visualised.</span></a>
    <a href="/routemap"><span class="num">03</span><strong>Route Map</strong><span>My own rendition of the official metro map, with future lines and landmarks.</span></a>
  </section>

  <section class="contracts-wrap"><ContractsCard {contracts} /></section>

  <section class="about">
    <div>
      <h2>About</h2>
      <p>We all know BMRCL and their contractors don't have the best track record when it comes to planning and meeting deadlines. Remember how long the Yellow Line was sitting, collecting dust after its civil works were finished, due to a lack of <strong>trains</strong>?</p>
      <p>Major cities like London, Paris, and Tokyo run 2-minute frequencies while I still have to wait 10 minutes during peak hour if I miss a train at Whitefield!</p>
      <p>Namma Metro needs more trains, and the public needs to know when they'll get here, so this repository strives to track and plot every trainset received, tested, and inducted into service to keep BMRCL accountable.</p>
      <p>All information comes from news outlets, reporters, press releases, and on-ground sources as BMRCL does not release this information publicly.</p>
      <p><strong>This project is not affiliated with BMRCL and is built to serve the public interest.</strong></p>    </div>
    <div>
      <h2>Acknowledgements</h2>
      <p>Thank you to journalists like Christin Mathew Philip (<a href="https://x.com/ChristinMP_" target="_blank" rel="noreferrer">@ChristinMP_</a>) and Muthi-ur-Rahman Siddiqui (<a href="https://x.com/ever_pessimist" target="_blank" rel="noreferrer">@ever_pessimist</a>).</p>
      <p>Thank you to enthusiasts like BLR Metro Tracker (<a href="https://x.com/blrmetrotracker" target="_blank" rel="noreferrer">@blrmetrotracker</a>) and The Metro Rail Guy (<a href="https://themetrorailguy.com" target="_blank" rel="noreferrer">themetrorailguy.com</a>).</p>
      <p>Thank you to news outlets like Moneycontrol, The Times of India, The Indian Express and Deccan Herald.</p>
      <p>And finally, thank you to the citizen insiders who share this information with us Bengalureans.</p>
      <p>Their reporting and groundwork allow us to stay informed and enable hobbyists like myself to make projects like this tracker possible.</p>
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
  /* One block for the untracked fleet: counted as a group, not drawn train by train. */
  .older-bar { display: flex; align-items: center; height: 16px; padding: 0 8px; border-radius: 3px; background: color-mix(in srgb, var(--service) 14%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--service) 55%, transparent); font-size: 10.5px; color: var(--service-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .panel-foot { margin: 0; font-size: 12px; line-height: 1.5; color: var(--muted); }
  .legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 11px; color: var(--muted); }
  .legend li { display: flex; align-items: center; gap: 6px; }
  .legend .pill { width: 8px; height: 12px; }
  .board-row { align-items: start; }
  .board-line, .board-count { line-height: 16px; }

  .story-wrap { max-width: 1240px; margin: 0 auto; padding: 0 32px 56px; }
  .more-stats { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; font-size: 14px; font-weight: 600; color: var(--ink); text-decoration: none; }
  .more-stats:hover { text-decoration: underline; text-underline-offset: 4px; }

  .contracts-wrap { max-width: 1240px; margin: 0 auto; padding: 0 32px 64px; }
  .explore { max-width: 1240px; margin: 0 auto; padding: 0 32px 64px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
  .explore a { display: flex; flex-direction: column; gap: 8px; padding: 24px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); text-decoration: none; }
  .explore a:hover { border-color: var(--faint); }
  .explore .num { font-size: 12px; color: var(--muted); }
  .explore strong { font-size: 20px; }
  .explore span:last-child { font-size: 14px; line-height: 1.5; color: var(--ink-3); }

  .about { border-top: 1px solid var(--border); background: var(--surface); display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 64px; padding: 56px max(32px, calc((100% - 1176px) / 2)) 64px; }
  .about h2 { margin: 0 0 14px; font-family: var(--font-display); font-size: 30px; letter-spacing: -0.02em; }
  .about p { margin: 0; font-size: 16px; line-height: 1.75; color: var(--ink-3); }
  .about p + p { margin-top: 16px; }

  @media (max-width: 960px) {
    h1 { font-size: clamp(40px, 8vw, 64px); }
    .title-grid { --map-w: clamp(96px, 24vw, 170px); column-gap: 20px; }
    .hero { grid-template-columns: 1fr; gap: 32px; padding: 40px 20px 32px; }
    .story-wrap, .explore { padding-left: 16px; padding-right: 16px; }
    .explore { grid-template-columns: 1fr; }
    .contracts-wrap { padding: 0 16px 48px; }
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
