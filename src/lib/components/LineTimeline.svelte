<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import { formatDate } from '$lib/data/date';
  import { milestoneDateLabel, referenceCount } from '$lib/data/evidence';
  import { stageColors } from '$lib/data/lifecycle';
  import { historyDateLabel, type HistoryEntry } from '$lib/data/line-timeline';
  import { durationLabel, monthsBetween, type DelayStory, type OpeningTarget } from '$lib/data/delay-story';
  import SourceLinks from './SourceLinks.svelte';
  import TrainIcon from './TrainIcon.svelte';
  import { rollingStockDesign } from '$lib/data/presentation';

  let { entries, color, story = null, gaps = {} }: { entries: HistoryEntry[]; color: string; story?: DelayStory | null; gaps?: Record<string, number> } = $props();

  // A report can set targets for more than one section (Pink: elevated and underground).
  const targetsFor = $derived.by(() => {
    const map = new Map<string, OpeningTarget[]>();
    for (const t of story?.targets ?? []) if (t.announced) map.set(t.milestoneId, [...(map.get(t.milestoneId) ?? []), t]);
    return map;
  });
  const multiSection = $derived((story?.sections.length ?? 0) > 1);
  const outcomeText = (t: OpeningTarget) =>
    t.outcome === 'missed' ? (t.monthsLate !== undefined ? `Missed by ${t.monthsLate} month${t.monthsLate === 1 ? '' : 's'}` : 'Passed, not open yet')
    : t.outcome === 'met' ? 'Met' : t.outcome === 'held' ? 'Held' : t.outcome === 'not-taken' ? 'Option not taken'
    : t.outcome === 'superseded' ? 'Pushed back' : 'Current target';
  const gapHeight = (days: number) => Math.round(Math.min(320, Math.max(44, (days / 30.44) * 6)));
  const phaseOf = (entry: HistoryEntry) => {
    const key = entry.groups?.[0]?.milestone.key;
    return key === 'revenue_induction' ? 'service' : key === 'factory_dispatch' || key === 'depot_arrival' ? 'dispatch' : 'testing';
  };
</script>

<ol class="history" style={`--line-color: ${color}`} aria-label="Chronological line history">
  {#each entries as entry (entry.id)}
    {@const targets = entry.lineMilestone ? (targetsFor.get(entry.lineMilestone.id) ?? []) : []}
    {@const target = targets[0]}
    {@const openingSection = story?.sections.find((x) => x.opening && x.opening.milestoneId === entry.lineMilestone?.id && x.earliest)}
    {@const isOpening = !!openingSection}
    {@const refs = entry.lineMilestone?.sources.length ?? entry.groups?.reduce((sum, group) => sum + group.milestone.sources.length, 0) ?? 0}
    <li id={entry.id} tabindex="-1" class="entry {entry.kind}" class:promise={!!target} class:opening={isOpening}
      style={`--event-color: ${entry.kind === 'train' ? stageColors[phaseOf(entry)].color : '#17211d'}`}>
      {#if entry.kind === 'train' && entry.trainset && rollingStockDesign[entry.trainset.rollingStockId]}<span class="train-marker"><TrainIcon design={rollingStockDesign[entry.trainset.rollingStockId]} size={20} /></span>{/if}
      <div class="event-meta">
        {#if entry.lineMilestone}<span>{historyDateLabel(entry.lineMilestone)}</span>
        {:else}<time datetime={entry.date}>{entry.groups?.[0] ? milestoneDateLabel(entry.groups[0].milestone) : formatDate(entry.date)}</time>{/if}
        {#if target}<span class="event-tag promise-tag">{multiSection ? 'Opening target' : `Target ${target.number} of ${target.of}`}</span>
        {:else if entry.kind !== 'train'}<span class="event-tag">{entry.tag}</span>{/if}
      </div>
      {#if entry.kind === 'train'}<h3>{entry.title}</h3>{:else}<h2>{entry.title}</h2>{/if}

      {#each targets as t (`${t.section}-${t.number}`)}
        <p class="target-change">
          {#if multiSection}<span class="section-label">{t.sectionLabel} {t.number}/{t.of}</span>{/if}
          {#if t.previousLabel}<s>{t.previousLabel}</s><span aria-hidden="true">→</span>{/if}
          <strong>{t.label}</strong>
          <span class="outcome {t.outcome}">{outcomeText(t)}</span>
        </p>
      {/each}
      {#if openingSection?.opening && openingSection.earliest}
        {@const scope = multiSection ? `${openingSection.noun} ` : ''}
        <p class="opening-note"><strong>{monthsBetween(openingSection.earliest.target, openingSection.opening.date)} months</strong> after the earliest recorded {scope}target ({openingSection.earliest.label}), with {openingSection.missed} {scope}target{openingSection.missed === 1 ? '' : 's'} missed along the way.</p>
      {/if}

      {#if entry.kind !== 'today'}
        <details class="event-details">
          <summary>Details <ChevronDown size={13} /><span class="reference-count">{referenceCount(refs)}</span></summary>
          <div class="details-body">
            {#if entry.lineMilestone}
              {@const milestone = entry.lineMilestone}
              {#if milestone.scope}<p class="scope">{milestone.scope}</p>{/if}
              <p class="description">{milestone.description}</p>
              {#if milestone.previous_target || milestone.revised_target}
                <dl class="deadline-comparison">
                  <div><dt>Previous target, as reported</dt><dd>{milestone.previous_target ?? 'Not established'}</dd></div>
                  <div><dt>Revised target, as reported</dt><dd>{milestone.revised_target ?? 'Not established'}</dd></div>
                </dl>
              {/if}
              {#if milestone.comments}<p class="evidence-note">{milestone.comments}</p>{/if}
              <SourceLinks sources={milestone.sources} label={`${entry.title}, ${historyDateLabel(milestone)}`} />
            {:else if entry.trainset && entry.groups}
              <p class="manufacturer">{entry.trainset.manufacturer}<span>{entry.trainset.contractId.toUpperCase()}</span></p>
              {#each entry.groups as group}
                <p class="train-fact">{group.sentence}</p>
                {#if group.milestone.comments}<p class="evidence-note">{group.milestone.comments}</p>{/if}
                {#if group.milestone.sources.length}<SourceLinks sources={group.milestone.sources} label={`${entry.title}, ${milestoneDateLabel(group.milestone)}`} />
                {:else}<p class="evidence-note">No direct source recorded.</p>{/if}
              {/each}
              <a class="train-link" href={`/fleet?trainset=${entry.trainset.id}`}>View trainset details</a>
            {/if}
          </div>
        </details>
      {/if}
    </li>
    {#if gaps[entry.id]}
      <li class="gap" style={`height: ${gapHeight(gaps[entry.id])}px`}><span>{durationLabel(gaps[entry.id])}<small>no recorded milestone</small></span></li>
    {/if}
  {/each}
</ol>

<style>
  /* --rail-x: distance from an entry's left edge back to the centre of the 2px line; every marker is centred on it. */
  .history { --rail-x: -29px; --ring: var(--bg); list-style: none; margin: 0 0 0 8px; padding: 0 0 0 28px; border-left: 2px solid var(--line-color); }
  li.entry { position: relative; padding: 0 0 26px; scroll-margin-top: calc(var(--site-header-height) + var(--timeline-dock-height, 80px) + 24px); }
  li.entry::before { content: ''; position: absolute; left: var(--rail-x); top: 9px; width: 10px; height: 10px; box-sizing: border-box; transform: translate(-50%, -50%); border: 2px solid var(--event-color); border-radius: 50%; background: var(--surface); box-shadow: 0 0 0 3px var(--ring); }
  li.line::before { width: 12px; height: 12px; border: 0; background: var(--ink); }
  li.train { padding-bottom: 14px; }
  li.train:has(.train-marker)::before { display: none; }
  .train-marker { position: absolute; left: var(--rail-x); top: 9px; transform: translate(-50%, -50%); padding: 2px 0; background: var(--ring); color: var(--event-color); line-height: 0; }

  .event-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: 12px; color: #687267; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
  .event-tag { padding: 2px 6px; border-radius: 4px; background: #e9ede6; color: #445048; font-weight: 650; font-size: 10px; letter-spacing: 0.02em; text-transform: uppercase; }
  h2 { font-size: 19px; line-height: 1.3; margin: 0; font-weight: 700; overflow-wrap: anywhere; }
  h3 { font-size: 14px; line-height: 1.35; margin: 0; font-weight: 650; color: #26342e; }
  .train .event-meta { margin-bottom: 1px; font-size: 11px; }

  /* Deadline changes read as broken promises. */
  li.promise::before { width: 12px; height: 12px; border: 2px solid #b4452f; background: var(--surface); }
  .promise-tag { background: #f6e3dc; color: #8f3522; }
  .target-change { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; margin: 8px 0 0; font-size: 15px; font-variant-numeric: tabular-nums; }
  .target-change s { color: #8a928a; text-decoration-thickness: 1.5px; }
  .target-change > span[aria-hidden] { color: #8a928a; }
  .outcome { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
  .outcome.missed { color: #8f3522; background: #f6e3dc; }
  .outcome.not-taken { color: #6d5a52; background: #efe9e5; }
  .outcome.met, .outcome.held { color: #0f6b3b; background: #dcefe3; }
  .outcome.pending { color: #1f6299; background: #e5eef6; }
  .outcome.superseded { color: #6d5a52; background: #efe9e5; }
  .section-label { min-width: 104px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }

  li.opening { padding: 18px 20px 20px; margin: 8px 0 30px -12px; border-radius: 8px; background: color-mix(in srgb, var(--line-color) 16%, #fffdfa); border: 1px solid color-mix(in srgb, var(--line-color) 55%, transparent); }
  /* The opening card is pulled 12px left and has a 1px border, so its marker sits 11px further right within it. */
  li.opening { --rail-x: -18px; --ring: color-mix(in srgb, var(--line-color) 16%, #fffdfa); }
  li.opening::before { top: 27px; box-shadow: 0 0 0 3px var(--bg); }
  li.opening h2 { font-size: 24px; }
  .opening-note { margin: 8px 0 0; font-size: 14px; line-height: 1.55; color: #26342e; }

  .gap { position: relative; display: flex; align-items: center; margin-left: -30px; padding-left: 28px; border-left: 2px solid #f4f6f1; }
  .gap::before { content: ''; position: absolute; left: -2px; top: 0; bottom: 0; border-left: 2px dashed var(--line-color); }
  .gap span { display: flex; flex-direction: column; gap: 2px; font-size: 13px; font-weight: 700; color: #445048; font-variant-numeric: tabular-nums; }
  .gap small { font-size: 11px; font-weight: 400; color: #8a928a; }

  .event-details { margin-top: 2px; }
  summary { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 4px 0; font-size: 12px; color: #536055; cursor: pointer; list-style: none; }
  .reference-count { color: #8a928a; font-size: 11px; }
  summary::-webkit-details-marker { display: none; }
  .event-details[open] summary :global(svg) { transform: rotate(180deg); }
  .details-body { padding: 2px 0 8px; max-width: 720px; }
  .description { margin: 6px 0; font-size: 14px; line-height: 1.7; color: #445048; }
  .scope { margin: 6px 0; color: #687267; font-size: 12px; }
  .evidence-note { font-size: 12px; line-height: 1.65; color: #687267; margin: 8px 0 12px; }
  .deadline-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 10px 0; margin: 8px 0; border-top: 1px solid #d8ded4; border-bottom: 1px solid #d8ded4; }
  dt { font-size: 11px; color: #687267; margin-bottom: 4px; }
  dd { margin: 0; font-size: 13px; line-height: 1.6; }
  .manufacturer { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; margin: 6px 0 10px; font-size: 13px; color: #536055; }
  .manufacturer span { font-size: 10px; color: #687267; }
  .train-fact { margin: 6px 0 10px; font-size: 13px; line-height: 1.6; }
  .train-link { display: inline-block; font-size: 11px; color: #536055; margin-top: 10px; text-underline-offset: 3px; }
  .train-link:hover { color: #0b5fe8; }
  li.today { padding-bottom: 6px; }
  li.today::before { background: var(--ink); border-color: var(--ink); }
  @media(max-width: 600px) {
    .history { padding-left: 22px; }
    .history { --rail-x: -23px; }
    li.opening { margin-left: -8px; padding: 14px 14px 16px; --rail-x: -16px; } li.opening::before { top: 23px; }
    h2 { font-size: 17px; } li.opening h2 { font-size: 20px; }
    .target-change { font-size: 14px; }
    .gap { margin-left: -24px; padding-left: 22px; }
    .deadline-comparison { grid-template-columns: 1fr; gap: 10px; }
  }
</style>
