import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// The old combined Tracker is now split into Fleet and Lifecycle; keep old links working.
export const load: PageLoad = ({ url }) => {
  redirect(308, `/fleet${url.search}`);
};
