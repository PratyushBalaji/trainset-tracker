import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fetchLastDataUpdate } from './scripts/data-update.mjs';

export default defineConfig(async () => {
  const updatedAt = await fetchLastDataUpdate();
  if (!updatedAt) console.warn('GitHub data-update date unavailable; the site will not substitute today.');
  return {
    plugins: [sveltekit()],
    define: { __TRAINSETS_UPDATED_AT__: JSON.stringify(updatedAt) }
  };
});
