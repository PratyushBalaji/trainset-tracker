<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from '@lucide/svelte';
  import { percentageBetween } from '$lib/data/date';
  import type { Story } from '$lib/data/stories';

  let { stories, interval = 8000 }: { stories: Story[]; interval?: number } = $props();

  let index = $state(0);
  // Only the pause button stops the rotation (hovering or focusing doesn't). A paused bar stays where it
  // stopped and Play carries on from there. Picking a story by hand starts its bar from 0 and keeps
  // whatever state it was in: still playing if it was playing, still paused if it was paused.
  let playing = $state(true);
  let elapsed = $state(0);
  let story = $derived(stories[index]);

  function go(i: number) {
    index = (i + stories.length) % stories.length;
    elapsed = 0;
  }

  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) playing = false;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (playing && !document.hidden && stories.length > 1) {
        elapsed += dt;
        if (elapsed >= interval) go(index + 1);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  const x = (date: string, start: string, end: string) => Math.min(100, Math.max(0, percentageBetween(date, start, end)));
</script>

<!-- Arrow keys move between stories when focus is within. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
  class="carousel"
  aria-roledescription="carousel"
  aria-label="Stories from the data"
  style={`--accent: ${story.color}`}
  onkeydown={(e) => { if (e.key === 'ArrowRight') go(index + 1); if (e.key === 'ArrowLeft') go(index - 1); }}
>
  {#key story.id}
    <article class="slide" aria-roledescription="slide" aria-label={`${index + 1} of ${stories.length}`}>
      <div class="text">
        <p class="kicker"><span class="dot" style={`--dot: ${story.color}`}></span>{story.kicker}</p>
        <h2>{story.headline}</h2>
        <p class="body tnum">{story.body}</p>
        <a class="link" href={story.link.href}>{story.link.label} <ArrowRight size={16} /></a>
      </div>

      <div class="visual" aria-hidden="true">
        {#if story.visual.type === 'ladder'}
          <ol class="ladder">
            {#each story.visual.rows as row}
              <li class={row.tone}><span class="target tnum" class:struck={row.struck}>{row.label}</span>{#if row.note}<span class="note tnum">{row.note}</span>{/if}</li>
            {/each}
          </ol>
        {:else if story.visual.type === 'window'}
          {@const v = story.visual}
          <div class="window">
            <div class="track">
              <span class="band" style={`left: ${x(v.band.from, v.start, v.end)}%; width: ${x(v.band.to, v.start, v.end) - x(v.band.from, v.start, v.end)}%`}><span>{v.band.label}</span></span>
              {#each v.marks as m}<span class="mark" style={`left: ${x(m.date, v.start, v.end)}%; background: ${m.color}`}></span>{/each}
              <span class="today" class:near-end={x(v.today, v.start, v.end) > 85} style={`left: ${x(v.today, v.start, v.end)}%`}><span>Today</span></span>
            </div>
            <!-- One row per flag, centred on its date, so nearby dates never collide. -->
            <div class="flags" style={`height: ${v.flags.length * 26}px`}>
              {#each v.flags as f, i}<span class="flag {f.tone}" style={`left: ${x(f.date, v.start, v.end)}%; top: ${i * 26}px`}>{f.label}</span>{/each}
            </div>
            <div class="axis tnum">
              {#each Array.from({ length: Number(v.end.slice(0, 4)) - Number(v.start.slice(0, 4)) }, (_, i) => Number(v.start.slice(0, 4)) + i + 1) as year}
                {#if `${year}-01-01` < v.end}<span style={`left: ${x(`${year}-01-01`, v.start, v.end)}%`}>{year}</span>{/if}
              {/each}
            </div>
            <p class="caption">{v.caption}</p>
          </div>
        {:else}
          {@const v = story.visual}
          <div class="bars">
            {#each v.rows as r}
              <div class="bar-row">
                <span class="bar-label tnum">{r.label}</span>
                <span class="bar-track"><span class="bar" class:open={r.open} style={`width: ${(r.value / v.max) * 100}%; --c: ${r.color}`}></span></span>
                <span class="bar-value tnum">{r.value} {v.unit}</span>
              </div>
            {/each}
            <p class="caption">{v.caption}</p>
          </div>
        {/if}
      </div>
    </article>
  {/key}

  <div class="controls">
    <button type="button" class="nav" aria-label="Previous story" onclick={() => go(index - 1)}><ChevronLeft size={18} /></button>
    <div class="dots" role="group" aria-label="Choose a story">
      {#each stories as s, i (s.id)}
        <button type="button" class="dot-btn" aria-label={`Story ${i + 1}: ${s.kicker}`} aria-current={i === index ? 'true' : undefined} onclick={() => go(i)}>
          <span class="fill" style={i === index ? `width: ${(elapsed / interval) * 100}%` : i < index ? 'width: 100%' : 'width: 0%'}></span>
        </button>
      {/each}
    </div>
    <button type="button" class="nav" aria-label="Next story" onclick={() => go(index + 1)}><ChevronRight size={18} /></button>
    <button type="button" class="nav" aria-label={playing ? 'Pause stories' : 'Play stories'} onclick={() => (playing = !playing)}>{#if playing}<Pause size={15} />{:else}<Play size={15} />{/if}</button>
  </div>
</section>

<style>
  .carousel { position: relative; border-radius: 16px; background: var(--ink); color: var(--surface); padding: 40px 44px 24px; outline: none; }
  .slide { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 420px); gap: 48px; min-height: 360px; animation: enter 450ms ease both; }
  @keyframes enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .text { display: flex; flex-direction: column; gap: 14px; }
  .kicker { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: color-mix(in srgb, var(--accent) 70%, #ffffff); }
  h2 { margin: 0; font-family: var(--font-display); font-size: clamp(26px, 3.2vw, 38px); line-height: 1.12; letter-spacing: -0.02em; font-weight: 800; }
  .body { margin: 0; font-size: 15px; line-height: 1.6; color: #c9d0c5; max-width: 560px; }
  .link { display: inline-flex; align-items: center; gap: 6px; margin-top: auto; font-size: 14px; font-weight: 600; color: var(--surface); text-decoration: none; }
  .link:hover { text-decoration: underline; text-underline-offset: 4px; }
  .visual { align-self: center; }

  .ladder { list-style: none; margin: 0; padding: 0 4px 0 0; display: flex; flex-direction: column; gap: 4px; max-height: 360px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #ffffff33 transparent; }
  .ladder li { display: flex; justify-content: space-between; gap: 12px; padding: 5px 10px; border-radius: 6px; font-size: 13px; background: #ffffff0d; }
  .ladder .struck { text-decoration: line-through; text-decoration-color: #e0705a; color: #c9d0c5; }
  .ladder .note { font-weight: 700; font-size: 12px; }
  .ladder .missed .note { color: #f09a85; }
  .ladder .met .note { color: #7fd1a2; }
  .ladder .muted .note { color: #8a928a; }
  .ladder .current { background: #2f7fbd33; }
  .ladder .current .note { color: #9cc7ea; }
  .ladder .highlight { background: var(--accent); color: var(--ink); font-weight: 700; }

  .window { display: flex; flex-direction: column; gap: 8px; padding-top: 34px; }
  .track { position: relative; height: 56px; border-radius: 6px; background: #ffffff0a; }
  .band { position: absolute; top: 0; bottom: 0; border-radius: 6px; background: #ffffff14; border: 1px dashed #ffffff40; }
  .band span { position: absolute; top: -22px; left: 0; font-size: 11px; color: #c9d0c5; white-space: nowrap; }
  .mark { position: absolute; top: 14px; bottom: 14px; width: 3px; margin-left: -1.5px; border-radius: 2px; }
  .today { position: absolute; top: -6px; bottom: -6px; border-left: 2px dotted #ffffff99; }
  .today span { position: absolute; top: -18px; left: 4px; font-size: 10px; color: #c9d0c5; }
  .today.near-end span { left: auto; right: 4px; }
  .flags { position: relative; }
  .flag { position: absolute; white-space: nowrap; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 999px; transform: translateX(-50%); }
  .flag.missed { background: #f09a8533; color: #f6b3a3; }
  .flag.current { background: #2f7fbd40; color: #b9d8f2; }
  .axis { position: relative; height: 16px; font-size: 11px; color: #8a928a; }
  .axis span { position: absolute; transform: translateX(-50%); }

  .bars { display: flex; flex-direction: column; gap: 8px; }
  .bar-row { display: grid; grid-template-columns: 104px minmax(0, 1fr) 56px; align-items: center; gap: 10px; font-size: 12px; }
  .bar-label { color: #c9d0c5; }
  .bar-track { height: 14px; border-radius: 4px; background: #ffffff0d; }
  .bar { display: block; height: 100%; border-radius: 4px; background: var(--c); }
  .bar.open { background: repeating-linear-gradient(135deg, var(--c) 0 6px, color-mix(in srgb, var(--c) 55%, transparent) 6px 9px); }
  .bar-value { text-align: right; font-weight: 700; }
  .caption { margin: 6px 0 0; font-size: 11px; color: #8a928a; }

  .controls { display: flex; align-items: center; gap: 8px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #ffffff1a; }
  .nav { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid #ffffff26; background: transparent; color: var(--surface); }
  .nav:hover { background: #ffffff14; }
  .dots { display: flex; gap: 6px; flex: 1; }
  .dot-btn { position: relative; flex: 1; max-width: 72px; height: 34px; border: 0; background: transparent; padding: 0; }
  .dot-btn::before { content: ''; position: absolute; left: 0; right: 0; top: 15px; height: 4px; border-radius: 2px; background: #ffffff26; }
  .fill { position: absolute; left: 0; top: 15px; height: 4px; border-radius: 2px; background: var(--surface); }

  @media (max-width: 960px) {
    .carousel { padding: 28px 22px 18px; }
    .slide { grid-template-columns: 1fr; gap: 24px; min-height: 0; }
    .ladder { max-height: 260px; }
  }
  @media (prefers-reduced-motion: reduce) { .slide { animation: none; } }
</style>
