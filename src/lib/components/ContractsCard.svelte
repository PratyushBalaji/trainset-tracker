<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import TrainIcon from './TrainIcon.svelte';
  import { formatDate } from '$lib/data/date';
  import { lineColors, lineShortLabels, manufacturerShortLabels } from '$lib/data/presentation';
  import { formatMoney, type ContractSummary } from '$lib/data/contracts';

  let { contracts }: { contracts: ContractSummary[] } = $props();

  const lineList = (lines: string[]) => {
    const names = lines.map((l) => lineShortLabels[l] ?? l);
    return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names.at(-1)}` : (names[0] ?? '');
  };
  const summary = (c: ContractSummary) => {
    if (c.description) return `${c.description} · ${lineList(c.lines)}`;
    const topUps = c.variations.length ? `, plus ${c.variations.length} top-up order${c.variations.length > 1 ? 's' : ''}` : '';
    return `${c.baseTrainsets ?? '?'} trains from ${c.awardee}${topUps} · ${lineList(c.lines)}`;
  };
  const pct = (n: number, d?: number) => (d ? `${Math.min(100, (n / d) * 100)}%` : '0%');
</script>

<section class="contracts" aria-labelledby="contracts-title">
  <div class="head">
    <h2 id="contracts-title">Contracts</h2>
    <p>The rolling stock orders behind the fleet. 4RS-DM and 5RS-DM are tracked train by train.</p>
  </div>

  <div class="list">
    {#each contracts as c (c.id)}
      <details class="contract" class:untracked={!c.tracked}>
        <summary>
          <span class="icon">{#if c.design}<TrainIcon design={c.design} size={30} />{/if}</span>
          <span class="title">
            <span class="code">{c.code}</span>
            {#if c.year}<span class="year tnum">{c.year}</span>{/if}
            {#if c.tracked}<span class="badge">Tracked</span>{/if}
          </span>
          <span class="one-line">{summary(c)}</span>
          {#if c.tracked && c.ordered}
            <span class="mini tnum" aria-label={`${c.delivered} of ${c.ordered} delivered`}><span class="mini-bar"><span style={`width: ${pct(c.delivered, c.ordered)}`}></span></span>{c.delivered}/{c.ordered}</span>
          {/if}
          <ChevronDown size={18} class="chev" />
        </summary>

        <div class="body">
          {#if c.tracked}
            <dl class="facts">
              <div><dt>Awardee</dt><dd>{c.awardee}</dd></div>
              {#if c.manufacturers.length}<div><dt>Built by</dt><dd>{c.manufacturers.join(', ')}</dd></div>{/if}
              {#each c.dates as d}<div><dt>{d.label}</dt><dd class="tnum">{formatDate(d.date)}</dd></div>{/each}
              <div><dt>Original order</dt><dd class="tnum">{`${c.baseTrainsets ?? '?'} trains${c.baseCars ? ` · ${c.baseCars} cars` : ''}`}{#if c.orderedBasis === 'cars'} <small>(trains worked out from cars)</small>{/if}</dd></div>
              {#if c.value}<div><dt>Original value</dt><dd class="tnum">{formatMoney(c.value)}</dd></div>{/if}
              {#if c.contractPeriod}<div><dt>Contract period</dt><dd>{c.contractPeriod}</dd></div>{/if}
            </dl>

            {#if c.variations.length}
              <ul class="topups">
                {#each c.variations as v}
                  <li class="tnum"><strong>+{v.trainsets} trains</strong>{#if v.line}<span>&nbsp;for</span><span class="dot" style={`--dot: ${lineColors[v.line]}`}></span><span>{lineShortLabels[v.line] ?? v.line}</span>{/if}<span class="rest">{[v.date && `ordered ${formatDate(v.date)}`, v.value && formatMoney(v.value)].filter(Boolean).join(' · ')}</span></li>
                {/each}
              </ul>
            {/if}

            <div class="progress">
              <div class="bar" role="img" aria-label={`${c.inService} in service and ${c.delivered} delivered of ${c.ordered} ordered`}>
                <span class="delivered" style={`width: ${pct(c.delivered, c.ordered)}`}></span>
                <span class="service" style={`width: ${pct(c.inService, c.ordered)}`}></span>
              </div>
              <p class="tnum"><strong>{c.delivered}</strong> of {c.ordered} delivered · <strong>{c.inService}</strong> in service</p>
            </div>

            <ul class="per-line">
              {#each c.perLine as l (l.line)}
                <li class="tnum"><span class="dot" style={`--dot: ${lineColors[l.line]}`}></span>{`${lineShortLabels[l.line] ?? l.line}: `}<strong>{l.ordered !== undefined ? `${l.delivered} of ${l.ordered}` : l.delivered}</strong>{` delivered${l.inService ? ` · ${l.inService} in service` : ''}`}</li>
              {/each}
            </ul>
            <a class="more" href="/fleet">See these trains in the fleet →</a>
          {:else}
            <dl class="facts">
              <div><dt>Awardee</dt><dd>{c.awardee}</dd></div>
              {#if c.manufacturers.length}<div><dt>Built by</dt><dd>{c.manufacturers.join(', ')}</dd></div>{/if}
              {#each c.dates as d}<div><dt>{d.label}</dt><dd class="tnum">{formatDate(d.date)}</dd></div>{/each}
              <div><dt>Original order</dt><dd>{c.orderDescription}</dd></div>
              {#if c.value}<div><dt>Original value</dt><dd class="tnum">{formatMoney(c.value)}</dd></div>{/if}
              {#if c.contractPeriod}<div><dt>Contract period</dt><dd>{c.contractPeriod}</dd></div>{/if}
            </dl>
            {#each c.variations as v}
              <p class="note">Additional order: {v.trainsets} new six-car trains · {v.cars} cars · {formatMoney(v.value)}{#if v.comments} · {v.comments}{/if}</p>
            {/each}
            <p class="note">Not tracked train by train: there aren't enough dated records for individual trainsets.</p>
          {/if}
          {#if c.comments}<p class="note">{c.comments}</p>{/if}
          {#if c.sources?.length}
            <p class="note">Sources: {#each c.sources as source, i}{#if i > 0} · {/if}<a href={source} target="_blank" rel="noreferrer">{new URL(source).hostname.replace(/^www\./, '')} {i + 1}</a>{/each}</p>
          {/if}
        </div>
      </details>
    {/each}
  </div>
</section>

<style>
  .contracts { display: flex; flex-direction: column; gap: 18px; padding: 28px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); }
  .head h2 { margin: 0; font-family: var(--font-display); font-size: 26px; letter-spacing: -0.02em; }
  .head p { margin: 4px 0 0; font-size: 14px; color: var(--ink-3); }
  .list { display: flex; flex-direction: column; border-top: 1px solid var(--border-soft); }
  .contract { border-bottom: 1px solid var(--border-soft); }
  summary { display: grid; grid-template-columns: 34px max-content minmax(0, 1fr) auto 20px; align-items: center; gap: 14px; min-height: 60px; padding: 8px 4px; list-style: none; cursor: pointer; }
  summary::-webkit-details-marker { display: none; }
  summary:hover { background: var(--hover); }
  .icon { color: var(--ink-2); display: grid; place-items: center; }
  .untracked .icon { color: var(--faint); }
  .title { display: flex; align-items: baseline; gap: 8px; }
  .code { font-family: var(--font-display); font-size: 18px; font-weight: 800; white-space: nowrap; }
  .year { font-size: 13px; color: var(--muted); }
  .badge { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: #dcefe3; color: var(--service-ink); }
  .one-line { font-size: 14px; color: var(--ink-3); min-width: 0; }
  .mini { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
  .mini-bar { width: 72px; height: 6px; border-radius: 3px; background: #e3e8df; overflow: hidden; }
  .mini-bar span { display: block; height: 100%; background: var(--testing); }
  .contract :global(.chev) { color: var(--muted); transition: transform 150ms ease; }
  .contract[open] :global(.chev) { transform: rotate(180deg); }
  .body { display: flex; flex-direction: column; gap: 16px; padding: 6px 4px 22px 52px; }
  .facts { margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px 20px; }
  .facts dt { font-size: 11px; color: var(--muted); }
  .facts dd { margin: 3px 0 0; font-size: 14px; }
  .facts small { color: var(--muted); }
  .topups { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--ink-3); }
  .topups strong { color: var(--ink); }
  .topups li { display: flex; align-items: center; flex-wrap: wrap; gap: 0 6px; }
  .topups .rest::before { content: '·'; margin-right: 6px; }
  .topups .rest:empty::before { content: none; }
  .progress { display: flex; flex-direction: column; gap: 6px; max-width: 520px; }
  .bar { position: relative; height: 10px; border-radius: 5px; background: #e3e8df; overflow: hidden; }
  .bar span { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 5px; }
  .bar .delivered { background: var(--testing); }
  .bar .service { background: var(--service); }
  .progress p { margin: 0; font-size: 13px; color: var(--ink-3); }
  .per-line { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 13px; color: var(--ink-3); }
  .per-line li { display: flex; align-items: center; gap: 6px; }
  .note { margin: 0; font-size: 13px; color: var(--muted); }
  .more { align-self: flex-start; font-size: 13px; font-weight: 600; }
  @media (max-width: 860px) {
    .contracts { padding: 20px 16px; }
    summary { grid-template-columns: 30px minmax(0, 1fr) 20px; gap: 4px 12px; }
    .title { grid-column: 2; }
    .one-line { grid-column: 2; grid-row: 2; font-size: 13px; }
    .mini { grid-column: 2; grid-row: 3; }
    .contract :global(.chev) { grid-column: 3; grid-row: 1; }
    .icon { grid-row: 1 / span 2; }
    .body { padding-left: 4px; }
  }
</style>
