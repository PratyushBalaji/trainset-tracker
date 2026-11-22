import { error } from '@sveltejs/kit';
import { lines } from '$lib/data/lines';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  if (!Object.hasOwn(lines, params.line)) error(404, 'Metro line not found');
  return { lineId: params.line, line: lines[params.line] };
};
