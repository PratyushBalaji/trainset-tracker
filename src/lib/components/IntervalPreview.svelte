<script lang="ts">
  import { X } from '@lucide/svelte';
  import { milestoneDateLabel } from '$lib/data/evidence';
  import type { DatedTrainset, TimelineSegment } from '$lib/data/types';

  import { onMount } from 'svelte';

  let { trainset, segment, pinned, anchor, onClose, onOpen, onEnter, onLeave }: {
    trainset: DatedTrainset; segment: TimelineSegment; pinned: boolean; anchor: HTMLElement;
    onClose: () => void; onOpen: () => void; onEnter: () => void; onLeave: () => void;
  } = $props();

  // Sit right next to the bar: below it when there's room, otherwise above, kept inside the window.
  let card: HTMLElement;
  let pos = $state({ top: 0, left: 0, ready: false });
  function place() {
    if (!anchor?.isConnected || !card) return;
    const bar = anchor.getBoundingClientRect();
    const w = card.offsetWidth, h = card.offsetHeight, gap = 8, margin = 12;
    const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
    const below = bar.bottom + gap;
    const top = below + h <= innerHeight - margin || bar.top - gap - h < header + margin ? below : bar.top - gap - h;
    const left = Math.min(Math.max(margin, bar.left), innerWidth - w - margin);
    pos = { top, left, ready: true };
  }
  $effect(() => { void anchor; void segment; queueMicrotask(place); });
  onMount(() => {
    const opts = { passive: true, capture: true } as const;
    addEventListener('scroll', place, opts);
    addEventListener('resize', place);
    return () => { removeEventListener('scroll', place, opts); removeEventListener('resize', place); };
  });
</script>

<aside bind:this={card} class="interval-preview" class:ready={pos.ready} style={`--top: ${pos.top}px; --left: ${pos.left}px`} aria-label={pinned ? 'Pinned interval information' : 'Interval preview'} onpointerenter={onEnter} onpointerleave={onLeave} onfocusin={onEnter} onfocusout={onLeave}>
  <header><div><strong>{trainset.trainsetNumber} · {trainset.lineSummary}</strong><small>{trainset.contractId.toUpperCase()} · {segment.label}</small></div><button type="button" class="preview-close" aria-label="Close interval information" title="Close interval information" onclick={onClose}><X size={16} /></button></header>
  <dl>{#each segment.sourceMilestones as milestone}<div><dt>{milestone.label}</dt><dd>{milestoneDateLabel(milestone)}</dd></div>{/each}</dl>
  <button type="button" class="open-details" onclick={onOpen}>See details</button>
</aside>

<style>
  .interval-preview { position: fixed; top: var(--top); left: var(--left); visibility: hidden; z-index: 45; width: min(360px, calc(100vw - 36px)); max-height: min(340px, 45svh); overflow: auto; padding: 12px; background: #fffdfa; border: 1px solid #cfd8ca; border-radius: 6px; box-shadow: 0 6px 22px #17211d25; font-size: 13px; }
  .interval-preview.ready { visibility: visible; }
  header { display: flex; gap: 12px; justify-content: space-between; align-items: start; }
  small { display: block; margin-top: 4px; color: #536055; font-size: 12px; line-height: 1.4; }
  button { min-height: 36px; border: 1px solid #d8ded4; background: #fffdfa; border-radius: 4px; padding: 6px 9px; font-size: 12px; }
  .preview-close { display: grid; place-items: center; min-width: 36px; padding: 0; }
  dl { margin: 10px 0; display: grid; gap: 7px; }
  dl div { display: flex; justify-content: space-between; gap: 14px; line-height: 1.4; }
  dt { color: #536055; font-size: 12px; }
  dd { margin: 0; text-align: right; }
  /* Phones: a steady panel along the bottom is easier to use with touch than a floating card. */
  @media(max-width: 820px) { .interval-preview { visibility: visible; top: auto; bottom: 8px; left: 8px; right: 8px; width: auto; max-height: min(230px, 34svh); } .preview-close, .open-details { min-height: 44px; } }
</style>
