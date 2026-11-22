<script lang="ts">
  import { X } from '@lucide/svelte';
  import { milestoneDateLabel } from '$lib/data/evidence';
  import type { DatedTrainset, TimelineSegment } from '$lib/data/types';

  let { trainset, segment, pinned, top, left, onClose, onOpen, onEnter, onLeave }: {
    trainset: DatedTrainset; segment: TimelineSegment; pinned: boolean; top: boolean; left: boolean;
    onClose: () => void; onOpen: () => void; onEnter: () => void; onLeave: () => void;
  } = $props();
  let dates = $derived(segment.id === 'manufacturing-window'
    ? trainset.milestones.filter((m) => m.key === 'factory_dispatch') : segment.sourceMilestones);
</script>

<aside class="interval-preview" class:at-top={top} class:at-left={left} aria-label={pinned ? 'Pinned interval information' : 'Interval preview'} onpointerenter={onEnter} onpointerleave={onLeave} onfocusin={onEnter} onfocusout={onLeave}>
  <header><div><strong>{trainset.trainsetNumber} · {trainset.lineSummary}</strong><small>{trainset.contractId.toUpperCase()} · {segment.label}</small></div><button type="button" class="preview-close" aria-label="Close interval information" title="Close interval information" onclick={onClose}><X size={16} /></button></header>
  <dl>{#each dates as milestone}<div><dt>{milestone.label}</dt><dd>{milestoneDateLabel(milestone)}</dd></div>{/each}</dl>
  {#if segment.id === 'manufacturing-window'}<p>Illustrative 70-day lead-in, not recorded manufacturing.</p>
  {:else if segment.derived}<p>{segment.id === 'dispatch-window' ? 'Illustrative interval end; depot arrival is not recorded.' : 'Extends to the chart boundary, not a recorded end date.'}</p>{/if}
  <button type="button" class="open-details" onclick={onOpen}>Open trainset details</button>
</aside>

<style>
  .interval-preview { position: fixed; right: 18px; bottom: 18px; z-index: 45; width: min(360px, calc(100vw - 36px)); max-height: min(340px, 45svh); overflow: auto; padding: 12px; background: #fffdfa; border: 1px solid #cfd8ca; border-radius: 6px; box-shadow: 0 6px 22px #17211d25; font-size: 13px; }
  .interval-preview.at-top { top: calc(var(--site-header-height) + 12px); bottom: auto; }
  .interval-preview.at-left { left: 18px; right: auto; }
  header { display: flex; gap: 12px; justify-content: space-between; align-items: start; }
  small { display: block; margin-top: 4px; color: #536055; font-size: 12px; line-height: 1.4; }
  button { min-height: 36px; border: 1px solid #d8ded4; background: #fffdfa; border-radius: 4px; padding: 6px 9px; font-size: 12px; }
  .preview-close { display: grid; place-items: center; min-width: 36px; padding: 0; }
  dl { margin: 10px 0; display: grid; gap: 7px; }
  dl div { display: flex; justify-content: space-between; gap: 14px; line-height: 1.4; }
  dt, p { color: #536055; font-size: 12px; }
  dd { margin: 0; text-align: right; }
  p { margin: 8px 0; line-height: 1.5; }
  @media(max-width: 820px) { .interval-preview, .interval-preview.at-left, .interval-preview.at-top { top: auto; bottom: 8px; left: 8px; right: 8px; width: auto; max-height: min(230px, 34svh); } .preview-close, .open-details { min-height: 44px; } }
</style>
