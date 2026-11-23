<script lang="ts">
  import { page } from '$app/state';
  import { Check, Link } from '@lucide/svelte';

  let { id, text, dark = false }: { id: string; text: string; dark?: boolean } = $props();
  let copied = $state(false);
  let url = $derived(`${page.url.origin}/stats#${id}`);
  let intent = $derived(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      location.hash = id;
    }
  }
</script>

<div class="share" class:dark>
  <a href={intent} target="_blank" rel="noreferrer" aria-label="Share on X (opens in new tab)">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.7 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.8 3h6.4l4.4 5.8L17.7 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11 14.5Z" /></svg>Share
  </a>
  <button type="button" onclick={copy} aria-label={copied ? 'Link copied' : 'Copy link to this stat'} title="Copy link">
    {#if copied}<Check size={13} aria-hidden="true" />{:else}<Link size={13} aria-hidden="true" />{/if}
  </button>
  <span class="sr-only" aria-live="polite">{copied ? 'Link copied' : ''}</span>
</div>

<style>
  .share { display: flex; gap: 6px; flex: none; }
  a, button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 32px; height: 32px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: inherit; font: 600 12px var(--font-body); text-decoration: none; cursor: pointer; }
  .dark a, .dark button { border-color: #ffffff2e; }
  a:hover, button:hover { background: var(--hover); }
  .dark a:hover, .dark button:hover { background: #ffffff14; }
  svg { width: 13px; height: 13px; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
