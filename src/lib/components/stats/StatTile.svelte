<script lang="ts">
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import ShareButtons from './ShareButtons.svelte';
  import NoticeChart from './NoticeChart.svelte';
  import PromiseBoard from './PromiseBoard.svelte';
  import NetworkMap from '$lib/components/NetworkMap.svelte';
  import IndiaRoute from './IndiaRoute.svelte';
  import { monthLabel, yearFraction, type SpeedScale, type Tile } from '$lib/data/stats';

  let { tile }: { tile: Tile } = $props();

  // One rule for every tile at every width: each sentence starts on its own line (a sentence ends with
  // "." or ")" — possibly just inside a bold run — and the next starts with a capital, digit or "(").
  const sentences = (text: string) => text.replace(/([.)])(\*\*)? +(?=(\*\*)?[A-Z0-9(])/g, '$1$2\n');
  const parts = (text: string) => sentences(text).split('**').map((t, i) => ({ t, strong: i % 2 === 1 }));
  // How long something took. Never a line colour, so it can't be mistaken for one.
  const speed = (days: number, s: SpeedScale) => (days <= s.fast ? 'var(--fast)' : days > s.slow ? 'var(--slow)' : 'var(--mid)');
  const pct = (date: string, start: string, end: string) => Math.max(0, Math.min(100, ((yearFraction(date) - yearFraction(start)) / (yearFraction(end) - yearFraction(start))) * 100));
  const years = (start: string, end: string) => Array.from({ length: Number(end.slice(0, 4)) - Number(start.slice(0, 4)) }, (_, i) => Number(start.slice(0, 4)) + i + 1);
</script>

<article class="tile {tile.size}" class:dark={tile.dark} class:has-route={tile.route} id={tile.id}>
  <div class="head">
    <p class="kicker">{tile.kicker}</p>
  </div>
  <!-- With a route map, headline and text share a row with it, so the chart always starts below the map. -->
  <div class="intro" class:with-side={tile.route || tile.icon} class:side-icon={tile.icon && !tile.route}>
  <div>
  {#if tile.big}
    <p class="big tnum">
      {#each tile.big.parts as part, i}{#if i && tile.big.arrow}<span class="to" aria-label="down to">→</span>{/if}{#if part.struck}<s>{part.n}</s>{:else}{part.n}{/if}{#if part.unit}<small>{part.unit}</small>{/if}{/each}
    </p>
  {/if}
  <p class="text">{#each parts(tile.text) as p}{#if p.strong}<strong>{p.t}</strong>{:else}{p.t}{/if}{/each}</p>
  </div>
  {#if tile.route}<div class="route-map"><IndiaRoute {...tile.route} size={0} /></div>
  {:else if tile.icon}<div class="intro-icon"><TrainIcon design={tile.icon} size={64} color={tile.dark ? '#eef1ea' : 'var(--ink)'} /></div>{/if}
  </div>

  {#if tile.viz}
    {@const v = tile.viz}
    <div class="viz" class:top={v.type === 'board'}>
      {#if v.type === 'window'}
        <div class="window" role="img" aria-label={v.flags.map((f) => f.label).join(', ')}>
          <span class="rail"></span>
          <span class="band" style={`left: ${pct(v.band.from, v.start, v.end)}%; width: ${pct(v.band.to, v.start, v.end) - pct(v.band.from, v.start, v.end)}%`}></span>
          {#each v.ticks as t}<span class="tick" style={`left: ${pct(t.date, v.start, v.end)}%; background: ${t.color}`}></span>{/each}
          {#each v.flags as f}<span class="flag" class:due={f.due} style={`left: ${pct(f.date, v.start, v.end)}%`}>{f.label}</span>{/each}
          {#each years(v.start, v.end) as y}{#if `${y}-01-01` < v.end}<span class="yr" style={`left: ${pct(`${y}-01-01`, v.start, v.end)}%`}>{y}</span>{/if}{/each}
        </div>
        <div class="key">{#each v.legend as l}<span><i style={`--c: ${l.color}`}></i>{l.label}</span>{/each}</div>
      {:else if v.type === 'gaps'}
        <!-- Width follows the tile so every gap chart renders at the same height and scale. -->
        {@const W = tile.size === 'w2' ? 258 : 560}
        {@const H = 170}
        {@const max = v.max}
        {@const bw = (W - 40) / v.bars.length}
        {@const y = (n: number) => H - 22 - (n / max) * (H - 34)}
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Days between deliveries, ${v.ends[0]} to ${v.ends[1]}`}>
          {#each [0, 30, 60, 90, 120].filter((n) => n <= max) as n}<line x1="30" x2={W} y1={y(n)} y2={y(n)} stroke="currentColor" stroke-opacity="0.08" /><text x="24" y={y(n) + 3} font-size="10" text-anchor="end" fill="var(--muted)">{n}</text>{/each}
          {#each v.bars as b, i}
            {@const h = Math.max(2, (b.days / max) * (H - 34))}
            <rect x={36 + i * bw} y={H - 22 - h} width={Math.max(2, bw - 3)} height={h} rx="2" fill={speed(b.days, v.scale)}><title>{b.label}</title></rect>
          {/each}
          <text x="36" y={H - 6} font-size="10" fill="var(--muted)">{v.ends[0]}</text>
          <text x={W} y={H - 6} font-size="10" text-anchor="end" fill="var(--muted)">{v.ends[1]}</text>
        </svg>
        <div class="key"><span><i style="--c: var(--fast)"></i>{v.scale.fast} days or less</span><span><i style="--c: var(--mid)"></i>{v.scale.fast + 1}–{v.scale.slow} days</span><span><i style="--c: var(--slow)"></i>more than {v.scale.slow}</span></div>
      {:else if v.type === 'line'}
        <!-- Scaled to the data's own range (not from zero) so small changes in days are visible. The highest
             and lowest dots carry their values. -->
        {@const days = v.points.map((p) => p.days)}
        {@const lo = Math.max(0, Math.min(...days) - 1)}
        {@const hi = Math.max(...days) + 1}
        {@const x = (i: number) => 26 + (i / Math.max(1, v.points.length - 1)) * 260}
        {@const y = (n: number) => 186 - ((n - lo) / Math.max(1, hi - lo)) * 160}
        {@const top = days.indexOf(Math.max(...days))}
        {@const bottom = days.indexOf(Math.min(...days))}
        <!-- Labels sit to the right of their dot (to the left near the right edge). -->
        {@const anchor = (i: number) => (x(i) > 230 ? 'end' : 'start')}
        {@const ax = (i: number) => (x(i) > 230 ? x(i) - 10 : x(i) + 10)}
        <svg viewBox="0 0 300 226" role="img" aria-label={`Factory to depot days, ${v.ends[0]} to ${v.ends[1]}`}>
          {#each [lo, Math.round((lo + hi) / 2), hi] as g}<line x1="18" x2="292" y1={y(g)} y2={y(g)} stroke="currentColor" stroke-opacity="0.07" /><text x="0" y={y(g) + 3} font-size="9" fill="var(--muted)">{g}</text>{/each}
          <polyline points={v.points.map((p, i) => `${x(i)},${y(p.days)}`).join(' ')} fill="none" stroke="#c9d0c5" stroke-width="1.5" />
          {#each v.points as p, i}<circle cx={x(i)} cy={y(p.days)} r={i === 0 || i === v.points.length - 1 ? 6 : 4} fill={p.approx ? 'var(--surface)' : speed(p.days, v.scale)} stroke={p.approx ? speed(p.days, v.scale) : 'none'} stroke-width="2"><title>{p.label}</title></circle>{/each}
          <text x={ax(top)} y={y(days[top]) + 4} font-size="11" font-weight="700" text-anchor={anchor(top)} fill={speed(days[top], v.scale)}>{days[top]} days</text>
          <text x={ax(bottom)} y={y(days[bottom]) + 4} font-size="11" font-weight="700" text-anchor={anchor(bottom)} fill={speed(days[bottom], v.scale)}>{days[bottom]} days</text>
          <text x="26" y="220" font-size="10" text-anchor="middle" fill="var(--muted)">{v.ends[0]}</text>
          <text x="286" y="220" font-size="10" text-anchor="middle" fill="var(--muted)">{v.ends[1]}</text>
        </svg>
      {:else if v.type === 'columns'}
        {@const max = Math.max(...v.bars.map((b) => b.days))}
        <!-- HTML bars rather than a fixed-shape SVG, so the chart grows to fill a tall tile. -->
        <div class="columns" role="img" aria-label={`Days from depot to passengers, ${v.ends[0]} to ${v.ends[1]}`}>
          <div class="cols">{#each v.bars as b}<span class="col" style={`height: ${Math.max(2, (b.days / max) * 100)}%; background: ${speed(b.days, v.scale)}`} title={b.label}></span>{/each}</div>
          <div class="col-ends"><span>{v.ends[0]}</span><span>{v.ends[1]}</span></div>
        </div>
        <div class="key"><span><i style="--c: var(--fast)"></i>{v.legend[0]}</span><span><i style="--c: var(--mid)"></i>{v.legend[1]}</span><span><i style="--c: var(--slow)"></i>{v.legend[2]}</span></div>
      {:else if v.type === 'compare'}
        <div class="compare">{#each v.items as c}<div>{#if c.design}<TrainIcon design={c.design} size={26} color="var(--on)" />{/if}<span>{c.label}</span><b class="tnum">{c.value}</b>{#if c.sub}<span>{c.sub}</span>{/if}</div>{/each}</div>
      {:else if v.type === 'spans'}
        {@const max = Math.max(...v.rows.map((r) => r.months))}
        <!-- One grid for the table and the bars, so their columns line up. -->
        <div class="spans" role="table" aria-label="Civil works done and first passengers, by line">
          <span role="columnheader"></span><span role="columnheader">Civil works done</span><span role="columnheader">First passengers</span><span role="columnheader" class="r">Wait</span>
          {#each v.rows as r}<span role="rowheader" class="name"><i style={`--c: ${r.color}`}></i>{r.label}</span><span role="cell">{r.from}</span><span role="cell">{r.to}</span><b role="cell" class="r">{r.months} months</b>{/each}
          {#each v.rows as r}<span class="bar-name">{r.label}</span><span class="bar-track track"><i style={`width: ${(r.months / max) * 100}%; background: ${r.color}`}></i></span><b class="r">{r.months} mo</b>{/each}
        </div>
      {:else if v.type === 'icons'}
        <div class="icons" class:fill={v.fill}>{#each v.items as item}<span title={item.label}><TrainIcon design={item.design ?? 'crrc-trsl'} size={v.size} color={item.color} /></span>{/each}</div>
        <div class="key">{#each v.legend as l}<span><i style={`--c: ${l.color}`}></i>{l.label}</span>{/each}</div>
      {:else if v.type === 'split'}
        <div class="hbars">
          {#each v.rows as r}
            <div class="hbar">
              <span class="lbl">{r.label}</span>
              <span class="track">{#if r.first !== undefined}<i style={`width: ${(Math.max(r.first, 3) / v.max) * 100}%; background: var(--travel)`}></i>{/if}<i style={`width: ${(r.second / v.max) * 100}%; background: var(--slow)`}></i></span>
              <b>{r.right}</b>
            </div>
          {/each}
        </div>
        <div class="key"><span><i style="--c: var(--travel)"></i>{v.legend[0]}</span><span><i style="--c: var(--slow)"></i>{v.legend[1]}</span></div>
      {:else if v.type === 'hbars'}
        <div class="hbars">
          {#each v.rows as r}<div class="hbar"><span class="lbl" title={r.label}>{r.label}{#if r.sub}<small>{r.sub}</small>{/if}</span><span class="track"><i style={`width: ${(r.value / v.max) * 100}%; background: ${r.color}`}></i></span><b>{r.right}</b></div>{/each}
        </div>
      {:else if v.type === 'ladder'}
        <ol class="ladder" style={`--c: ${v.color}`}>
          {#each v.rows as r}<li class:missed={r.missed} class:open={r.open}><span>{r.label}</span>{#if r.note}<span>{r.note}</span>{/if}</li>{/each}
        </ol>
      {:else if v.type === 'stations'}
        {@const step = 692 / Math.max(1, v.stops.length - 1)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="strip" tabindex="0" aria-label="Opening dates; scrolls sideways on small screens">
          <svg viewBox="0 0 760 100" role="img" aria-label={`${v.stops.length} dates, ${v.stops.filter((s) => s.state === 'missed').length} missed`}>
            <line x1="34" x2="726" y1="44" y2="44" stroke={v.color} stroke-width="10" stroke-linecap="round" />
            {#each v.stops as s, i}
              {@const cx = 34 + i * step}
              {#if s.state === 'kept'}
                <circle cx={cx} cy="44" r="11" fill="#fff" stroke={v.color} stroke-width="5" />
                <path d={`M ${cx - 5} 44 l 4 4 l 7 -8`} fill="none" stroke="var(--fast)" stroke-width="3" stroke-linecap="round" />
              {:else if s.state === 'floor'}
                <!-- "Not before" was a floor, not an opening date: neither kept nor missed. -->
                <circle cx={cx} cy="44" r="8" fill="#1b2420" stroke="#a9b3a6" stroke-width="3" />
                <path d={`M ${cx - 4} 44 h 8`} stroke="#a9b3a6" stroke-width="3" stroke-linecap="round" />
              {:else}
                <circle cx={cx} cy="44" r="9" fill="#e5484d" stroke="#1b2420" stroke-width="2" />
                <path d={`M ${cx - 4} 40 l 8 8 M ${cx + 4} 40 l -8 8`} stroke="#fff" stroke-width="2.6" stroke-linecap="round" />
              {/if}
              <!-- Labels alternate above and below; the full wording shows on hover. -->
              <text x={cx} y={i % 2 ? 84 : 20} text-anchor="middle" font-size={v.stops.length > 9 ? 11 : 12.5} font-weight={s.state === 'kept' ? 800 : 500} fill={s.state === 'kept' ? '#eef1ea' : '#a9b3a6'} text-decoration={s.state === 'missed' ? 'line-through' : undefined}><title>{s.full}</title>{s.label}</text>
            {/each}
          </svg>
        </div>
        <div class="key"><span><i class="dot" style="--c: #e5484d"></i>missed</span><span><i class="dot" style="--c: var(--fast)"></i>kept</span><span><i class="dot" style="--c: #a9b3a6"></i>"not before" date, not a deadline</span></div>
      {:else if v.type === 'orders'}
        <!-- One shared time axis, so both orders can be compared against their due dates. -->
        <div class="orders">
          <span class="today-line" style={`left: ${pct(v.today, v.start, v.end)}%`}></span>
          {#each v.rows as r}
            <div class="order">
              <div class="order-head">
                {#if r.design}<TrainIcon design={r.design} size={24} color="var(--on)" />{/if}
                <span><b>{r.code}</b> · {r.builder}<small>{r.delivered} of {r.ordered} delivered</small></span>
                <strong class="tnum">~{monthLabel(r.done)}</strong>
              </div>
              <div class="order-track">
                <span class="done-bar" style={`left: ${pct(r.first, v.start, v.end)}%; width: ${pct(r.last, v.start, v.end) - pct(r.first, v.start, v.end)}%`}></span>
                <span class="todo-bar" style={`left: ${pct(r.last, v.start, v.end)}%; width: ${pct(r.done, v.start, v.end) - pct(r.last, v.start, v.end)}%`}></span>
                <span class="due" style={`left: ${pct(r.due, v.start, v.end)}%`} title={`Due ${monthLabel(r.due)}`}><span>due {monthLabel(r.due)}</span></span>
              </div>
            </div>
          {/each}
          <div class="order-axis">
            {#each years(v.start, v.end) as y}{#if `${y}-01-01` < v.end && y % 2 === 0}<span style={`left: ${pct(`${y}-01-01`, v.start, v.end)}%`}>{y}</span>{/if}{/each}
            <span class="now" style={`left: ${pct(v.today, v.start, v.end)}%`}>today</span>
          </div>
        </div>
        <div class="key"><span><i style="--c: var(--on)"></i>delivered</span><span><i class="dashed"></i>still to come (estimate)</span><span><i style="--c: var(--slow)"></i>contract due date</span></div>
      {:else if v.type === 'map'}
        <div class="map"><NetworkMap segment={v.segment} segmentLabel={v.label} caption={false} weight={4} /></div>
      {:else if v.type === 'notice'}
        <NoticeChart points={v.points} worse={v.worse} />
      {:else if v.type === 'board'}
        <PromiseBoard rows={v.rows} />
      {/if}
    </div>
  {/if}
  {#if tile.note}<p class="note">{tile.note}</p>{/if}

  <div class="foot">
    <a class="src" href={tile.link.href}>{tile.link.label} →</a>
    <ShareButtons id={tile.id} text={tile.share} dark={tile.dark} />
  </div>
</article>

<style>
  .tile { --fast: #2a9d8f; --mid: #e6a23c; --slow: #c8553d; --travel: #9aa59a; --on: var(--ink); --on-2: var(--ink-3); --on-3: var(--muted); --soft: #e9ede5;
    position: relative; display: flex; flex-direction: column; min-height: 220px; padding: 20px 22px 14px; border-radius: 18px; background: var(--surface); border: 1px solid var(--border); color: var(--on); scroll-margin-top: 120px; }
  .tile.dark { --on: #eef1ea; --on-2: #a9b3a6; --on-3: #8f998c; --muted: #8f998c; --soft: #ffffff10; background: #1b2420; border-color: #1b2420; }
  .tile:target { outline: 3px solid var(--mid); outline-offset: 3px; }
  .w2 { grid-column: span 2; } .w3 { grid-column: span 3; } .w4 { grid-column: span 4; } .w6 { grid-column: span 6; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .head :global(.train-icon) { margin: -4px -2px -12px 0; opacity: 0.9; }
  /* The route map sits in its own top-right corner; the headline and text stop short of it. */
  .has-route { --map-w: clamp(84px, 26%, 136px); }
  /* Top edge lines up with the big number (kicker line + its margin), so the kicker keeps the full width. */
  .intro.with-side { --side-w: var(--map-w, 0px); display: grid; grid-template-columns: minmax(0, 1fr) var(--side-w); gap: 12px; align-items: start; }
  /* A big train beside the headline, like the route map, instead of a small one tucked in the corner. */
  .intro.side-icon { --side-w: clamp(56px, 18%, 92px); }
  .intro-icon { margin-top: 6px; opacity: 0.92; }
  .intro-icon :global(.train-icon) { width: 100% !important; height: auto !important; }
  .route-map { margin-top: 6px; }
  .route-map :global(.india-route) { width: 100%; }
  .kicker { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--on-3); }
  .big { margin: 10px 0 4px; font: 800 clamp(40px, 4.6vw, 62px)/0.95 var(--font-display); letter-spacing: -0.04em; }
  .w2 .big { font-size: clamp(36px, 3.6vw, 50px); }
  .big small { font-size: 0.4em; letter-spacing: -0.01em; font-weight: 700; margin-left: 6px; color: var(--on-3); }
  .big .to { color: var(--on-3); font-weight: 600; margin: 0 0.1em; }
  .big s { text-decoration-thickness: 0.07em; text-decoration-color: var(--slow); color: var(--on-3); }
  .text { margin: 0; white-space: pre-line; font-size: 15px; line-height: 1.45; color: var(--on-2); max-width: 62ch; }
  .text strong { color: var(--on); font-weight: 650; white-space: nowrap; }
  .viz { margin-top: 16px; flex: 1; display: flex; flex-direction: column; justify-content: flex-end; }
  .viz.top { justify-content: flex-start; }
  .viz svg { width: 100%; height: auto; display: block; overflow: visible; }
  .note { margin: 10px 0 0; white-space: pre-line; font-size: 12px; color: var(--on-3); }
  .foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 12px; }
  .dark .foot { border-color: #ffffff17; }
  .src { color: var(--on-3); text-decoration: none; }
  .src:hover { color: var(--on); text-decoration: underline; }
  .key { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; font-size: 11px; color: var(--on-3); }
  .key i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; background: var(--c); vertical-align: -1px; }

  .window { position: relative; height: 112px; margin-top: 4px; }
  .rail { position: absolute; left: 0; right: 0; top: 40px; height: 22px; border-radius: 6px; background: var(--soft); }
  .band { position: absolute; top: 40px; height: 22px; border-radius: 6px; background: #c8553d22; border: 1.5px dashed var(--slow); }
  .tick { position: absolute; top: 44px; width: 3px; height: 14px; margin-left: -1.5px; border-radius: 2px; background: var(--on); }
  .flag { position: absolute; top: 92px; transform: translateX(-50%); font-size: 11px; font-weight: 700; white-space: nowrap; color: var(--on); }
  .flag.due { top: 12px; color: #f09a85; }
  .tile:not(.dark) .flag.due { color: var(--slow); }
  .yr { position: absolute; top: 66px; transform: translateX(-50%); font-size: 10px; color: var(--on-3); }

  /* Bar lists stretch to the tile and spread their rows evenly, so a tall neighbour never leaves a gap. */
  .hbars { flex: 1; display: grid; align-content: space-evenly; gap: 8px; font-size: 12px; }
  .hbar { display: grid; grid-template-columns: minmax(172px, 0.5fr) minmax(0, 1fr) 52px; gap: 10px; align-items: center; color: var(--on-2); }
  .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lbl small { margin-left: 6px; color: var(--on-3); }
  .track { height: 14px; border-radius: 4px; background: var(--soft); display: flex; overflow: hidden; }
  .track i { display: block; height: 100%; }
  .hbar b { text-align: right; white-space: nowrap; color: var(--on); font-variant-numeric: tabular-nums; }

  .compare { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .compare div { display: flex; flex-direction: column; justify-content: center; gap: 2px; padding: 14px 12px; border-radius: 12px; background: var(--soft); }
  .compare b { font: 800 24px var(--font-display); letter-spacing: -0.02em; }
  .compare span { font-size: 12px; color: var(--on-3); }
  .compare :global(.train-icon) { margin-bottom: 4px; }
  .spans { display: grid; grid-template-columns: max-content 1fr 1fr auto; gap: 8px 14px; align-items: center; font-size: 13px; }
  .spans [role='columnheader'] { font-size: 11px; font-weight: 600; color: var(--on-3); }
  .spans .name { font-weight: 650; white-space: nowrap; }
  .spans .name i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; background: var(--c); vertical-align: -1px; }
  .spans .r { text-align: right; }
  .spans .bar-name { margin-top: 6px; color: var(--on-2); font-size: 12px; white-space: nowrap; }
  .spans .bar-track { grid-column: 2 / 4; margin-top: 6px; }
  .spans b.r:nth-last-child(-n + 1), .spans .bar-name ~ b.r { margin-top: 6px; }

  .icons { display: flex; flex-wrap: wrap; gap: 3px; }
  .columns { flex: 1; display: flex; flex-direction: column; min-height: 150px; }
  .cols { flex: 1; display: flex; align-items: flex-end; justify-content: space-between; gap: 6px; padding: 0 2px; border-bottom: 1px solid var(--border); }
  .col { flex: 1; max-width: 22px; border-radius: 4px 4px 0 0; }
  .col-ends { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: var(--on-3); }
  .icons.fill { flex: 1; display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); align-content: center; gap: 6px 4px; }
  .icons.fill :global(.train-icon) { width: 100% !important; height: auto !important; }
  .orders { position: relative; flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; gap: 18px; }
  .order-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; color: var(--on-2); }
  .order-head span { flex: 1; line-height: 1.3; }
  .order-head b { color: var(--on); }
  .order-head small { display: block; color: var(--on-3); }
  .order-head strong { font: 800 22px var(--font-display); letter-spacing: -0.02em; color: var(--on); }
  .order-track { position: relative; height: 12px; border-radius: 6px; background: var(--soft); }
  .done-bar { position: absolute; top: 0; bottom: 0; border-radius: 6px 0 0 6px; background: var(--on); }
  .todo-bar { position: absolute; top: 3px; bottom: 3px; border-radius: 0 4px 4px 0; background: repeating-linear-gradient(90deg, var(--on-3) 0 6px, transparent 6px 10px); }
  .due { position: absolute; top: -5px; bottom: -5px; width: 3px; margin-left: -1.5px; border-radius: 2px; background: var(--slow); }
  .due span { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 700; color: var(--slow); white-space: nowrap; }
  .today-line { position: absolute; top: 34px; bottom: 16px; border-left: 1.5px dotted var(--on-3); }
  .order-axis { position: relative; height: 16px; margin-top: 10px; border-top: 1px solid var(--border); font-size: 10px; color: var(--on-3); }
  .order-axis span { position: absolute; top: 3px; transform: translateX(-50%); }
  .order-axis .now { font-weight: 700; color: var(--on-2); }
  .key i.dashed { background: repeating-linear-gradient(90deg, var(--on-3) 0 4px, transparent 4px 6px); }
  .key i.dot { border-radius: 50%; }
  .map { flex: 1; display: grid; place-items: center; }
  .map :global(figure) { margin: 0; width: min(100%, 500px); }
  .icons span { line-height: 0; }

  .ladder { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; font-size: 12.5px; }
  .ladder li { display: flex; justify-content: space-between; gap: 10px; padding: 4px 10px; border-radius: 6px; background: var(--soft); }
  .ladder li span:last-child { font-weight: 700; color: var(--on-3); }
  .ladder li.missed span:first-child { text-decoration: line-through; text-decoration-color: #e0705a; color: var(--on-2); }
  .ladder li.missed span:last-child { color: #f09a85; }
  .ladder li.open { background: var(--c); font-weight: 700; }
  .ladder li.open span { color: #17211d; }

  .strip { overflow-x: auto; scrollbar-width: thin; scrollbar-color: #ffffff33 transparent; }

  @media (max-width: 980px) { .w2, .w3, .w4, .w6 { grid-column: span 2; } }
  @media (max-width: 520px) {
    .tile { padding: 18px 16px 12px; min-height: 0; }
    .hbar { grid-template-columns: minmax(0, 0.42fr) minmax(0, 1fr) auto; gap: 8px; }
    .hbar b { white-space: nowrap; }
    .strip svg { width: 600px; }
  }
</style>
