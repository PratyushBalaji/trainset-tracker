<script lang="ts">
  import { browser, dev } from '$app/environment';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { lineColors, lineOrder } from '$lib/data/presentation';
  import brandSvg from '../../static/icons/trains/beml-og-small.svg?raw';
  import '../app.css';

  const brandIcon = brandSvg.replace(/<title>.*?<\/title>/, '').replace('role="img"', 'aria-hidden="true" focusable="false"');

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
    { href: '/stats', label: 'Stats', match: '/stats' },
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
      <span class="brand-icon" aria-hidden="true" title="BEML original">{@html brandIcon}</span>
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
  <span>Built by Pratyush Balaji</span>
  <div class="footer-socials">
    <a href="https://github.com/PratyushBalaji" target="_blank" rel="noreferrer" aria-label="Pratyush Balaji on GitHub" title="GitHub">
      <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
    </a>
    <a href="https://www.linkedin.com/in/pratyush-balaji/" target="_blank" rel="noreferrer" aria-label="Pratyush Balaji on LinkedIn" title="LinkedIn">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96C2 21.32 2.69 22 3.55 22h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.46 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.29 10.85H15.8v-4.65c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.51V9.2h2.83v1.3h.04c.39-.74 1.36-1.52 2.8-1.52 3 0 3.57 1.97 3.57 4.53v5.24Z"/></svg>
    </a>
  </div>
</footer>

<style>
  .site-footer { flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; }
  .footer-socials { display: flex; justify-content: center; gap: 8px; }
  .footer-socials a { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 6px; }
  .footer-socials a:hover { color: var(--ink); background: var(--hover); }
  .brand-icon { display: inline-block; flex: none; line-height: 0; width: 28px; height: 28px; }
  .brand-icon :global(svg) { width: 100%; height: 100%; display: block; }
</style>
