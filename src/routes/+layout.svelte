<script lang="ts">
  import { browser, dev } from '$app/environment';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { lineColors, lineOrder } from '$lib/data/presentation';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import '../app.css';

  if (browser && !dev) {
    injectAnalytics({ mode: 'production', debug: false });
    injectSpeedInsights({ debug: false });
  }

  let { children } = $props();
  let condensed = $state(false);
  const links = [
    { href: '/', label: 'Home', match: '/' },
    { href: '/fleet', label: 'Fleet', match: '/fleet' },
    { href: '/lifecycle', label: 'Lifecycle', match: '/lifecycle' },
    { href: '/timeline/yellow', label: 'Timeline', match: '/timeline' },
    { href: '/routemap', label: 'Route Map', match: '/routemap' }
  ];
  onMount(() => {
    const update = () => { if (window.scrollY > 180) condensed = true; else if (window.scrollY < 80) condensed = false; };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  });
</script>

<a class="skip-link" href="#page-content">Skip to content</a>
<header class="site-header" class:condensed>
  <a class="site-brand" href="/" aria-label="Namma Metro Trainset Tracker home">
    <span class="brand-mark" aria-hidden="true">
      <TrainIcon design="beml-og" variant="small" size={28} />
      <span class="brand-track">{#each lineOrder as line}<span style={`background: ${lineColors[line]}`}></span>{/each}</span>
    </span>
    <span class="brand-name"><span>Namma Metro</span> <span>Trainset Tracker</span></span>
  </a>
  <nav aria-label="Main navigation">
    {#each links as link}
      {@const active = link.match === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(link.match)}
      <a href={link.href} aria-current={active ? 'page' : undefined}>{link.label}</a>
    {/each}
  </nav>
  <a class="site-source" href="https://github.com/PratyushBalaji/trainset-tracker" target="_blank" rel="noreferrer" aria-label="Project on GitHub">
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
    <span>GitHub</span>
  </a>
</header>
<div id="page-content">
{@render children()}
</div>
<footer class="site-footer">
  <span>Namma Metro Trainset Tracker</span>
  <span>By <a href="https://github.com/PratyushBalaji" target="_blank" rel="noreferrer">Pratyush Balaji</a></span>
</footer>
