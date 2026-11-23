// Guards the Stats page: every tile and story must still build from the current data, with no
// broken numbers, so a data edit can't silently empty the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/load-module.mjs';

const { buildStats } = await import(loadModule(new URL('../src/lib/data/stats.ts', import.meta.url)));
const { todayIsoDate } = await import(loadModule(new URL('../src/lib/data/date.ts', import.meta.url)));
const stats = buildStats(todayIsoDate());

const tiles = stats.chapters.flatMap((c) => c.tiles);
if (process.env.STATS_DUMP) console.log(JSON.stringify(stats.chapters.map((c) => ({ id: c.id, tiles: c.tiles.map(({ viz, ...t }) => t) })), null, 2));

// Every chapter and tile the Stats page is expected to show. Adding a tile: add its id here.
const EXPECTED = {
  deliveries: ['due-4rs-dm', 'due-5rs-dm', 'titagarh-gaps', 'beml-gaps', 'titagarh-transit', 'finish', 'who-builds'],
  waiting: ['line-ready', 'before-opening', 'track-ready', 'waiting-now'],
  'opening-dates': ['yellow-dates', 'purple-parts', 'most-dates', 'notice', 'furthest-slip', 'still-waiting']
};

test('every Stats chapter and tile still builds from the current data', () => {
  assert.deepEqual(Object.fromEntries(stats.chapters.map((c) => [c.id, c.tiles.map((t) => t.id)])), EXPECTED, 'A stats tile stopped building or moved; see src/lib/data/stats.ts.');
  assert.equal(new Set(tiles.map((t) => t.id)).size, tiles.length, 'tile ids must be unique (they are share links)');
});

test('stats text has no broken numbers', () => {
  for (const t of tiles) {
    const text = [t.kicker, t.text, t.note ?? '', t.share, JSON.stringify(t.big ?? {}), JSON.stringify(t.viz ?? {})].join(' ');
    assert.doesNotMatch(text, /undefined|NaN|null|Infinity/, `${t.id}: ${text.slice(0, 200)}`);
    assert.ok(t.share.length <= 250, `${t.id} share text is too long for a post`);
  }
});

test('the ORR map tile still carries its reviewed length', () => {
  const slip = tiles.find((t) => t.id === 'furthest-slip');
  assert.equal(slip.viz.type, 'map');
  assert.equal(slip.viz.label, '19.75 km', 'The Phase 2A length reading stopped matching lines.json; see segmentLengths in stats.ts.');
});

test('durations ignore inferred dates and stay plausible', () => {
  for (const t of stats.trains) {
    if (t.transitDays !== undefined) assert.ok(t.transitDays >= 0 && t.transitDays < 120, `${t.id} transit ${t.transitDays}`);
    if (t.depotDays !== undefined) assert.ok(t.depotDays >= 0, `${t.id} depot ${t.depotDays}`);
  }
  // BEML 5RS-DM dispatch dates are mostly inferred a day before arrival; they must not count as measured transit.
  assert.equal(stats.trains.find((t) => t.id === 'bmrcl-5rs-dm-ts003').transitDays, undefined);
  // Factory to depot needs exact dates on both ends: TS002's dispatch is the flag-off ceremony, TS011's
  // dispatch is only "on or after", TS018's arrival only "on or before".
  for (const n of ['ts002', 'ts011', 'ts018']) {
    assert.equal(stats.trains.find((t) => t.id === `bmrcl-4rs-dm-${n}`).transitDays, undefined, n);
    assert.equal(stats.trains.find((t) => t.id === `bmrcl-4rs-dm-${n}`).trip, undefined, `${n} should stay out of the trend chart while its date is unchanged`);
  }
  // Approximate dates still count on the trend chart; only the reviewed exclusions are left out.
  assert.ok(stats.trains.filter((t) => t.maker === 'Titagarh Rail Systems' && t.trip).length >= 14);
});
