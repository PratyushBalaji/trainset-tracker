<script lang="ts">
  import { Info } from '@lucide/svelte';
</script>

<p class="coverage"><Info size={15} aria-hidden="true" />
  <span>Tracking the <strong>4RS-DM and 5RS-DM</strong> contracts covering 102 trainsets. 38 trains on record as of today. The <strong class="tnum">57</strong> older trains on Purple and Green (2RS-DM and 3RS-DM) do not have sufficient tracking information and are thus omitted</span>
</p>

<style>
  .coverage { display: flex; gap: 10px; align-items: flex-start; margin: 0; padding: 12px 14px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border-soft); font-size: 13px; line-height: 1.5; color: var(--ink-3); }
  .coverage :global(svg) { flex: none; margin-top: 2px; color: var(--muted); }
  strong { color: var(--ink); font-weight: 600; }
</style>
