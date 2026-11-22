import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLastDataUpdate } from '../scripts/data-update.mjs';

test('last update uses the latest GitHub commit affecting trainsets.json', async () => {
  const timestamp = '2026-11-21T02:39:24Z';
  const result = await fetchLastDataUpdate(async (url, options) => {
    const query = new URL(url);
    assert.equal(query.searchParams.get('path'), 'trainsets.json');
    assert.equal(query.searchParams.get('per_page'), '1');
    assert.ok(options.signal);
    return Response.json([{ commit: { author: { date: '2026-11-01T00:00:00Z' }, committer: { date: timestamp } } }]);
  });
  assert.equal(result, timestamp);
});

test('unavailable or invalid metadata never substitutes the current date', async () => {
  for (const body of [[], {}, [{ commit: { committer: { date: 'invalid' } } }]]) {
    assert.equal(await fetchLastDataUpdate(async () => Response.json(body)), null);
  }
  assert.equal(await fetchLastDataUpdate(async () => new Response(null, { status: 403 })), null);
  assert.equal(await fetchLastDataUpdate(async () => { throw new Error('Offline'); }), null);
});
