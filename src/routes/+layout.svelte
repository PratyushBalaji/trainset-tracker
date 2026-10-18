<script lang="ts">
  import { browser, dev } from '$app/environment';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
  import '../app.css';

  if (browser && !dev) {
    injectAnalytics({ mode: 'production', debug: false });
    injectSpeedInsights({ debug: false });
  }

  let { children } = $props();
</script>

{@render children()}
