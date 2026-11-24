// Guards the Home story carousel: if a data edit (trainset dates, contract periods, line targets)
// makes a slide's reviewed reading stop matching, the slide would silently vanish from the site.
// This test fails instead, so the change has to be looked at before it ships.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/load-module.mjs';

const { buildStories } = await import(loadModule(new URL('../src/lib/data/stories.ts', import.meta.url)));
const { todayIsoDate } = await import(loadModule(new URL('../src/lib/data/date.ts', import.meta.url)));
const { buildDelayStory } = await import(loadModule(new URL('../src/lib/data/delay-story.ts', import.meta.url)));
const { lines } = await import(loadModule(new URL('../src/lib/data/lines.ts', import.meta.url)));

// Every slide the Home carousel is expected to show. Adding a slide: add its id here.
const EXPECTED = [
  'yellow-deadlines',
  'bmrcl-4rs-dm-delivery',
  'pink-deadlines',
  'purple-parts',
  'delivery-to-passengers',
  'waiting-now'
];

test('every Home story slide still builds from the current data', () => {
  const stories = buildStories(todayIsoDate());
  const ids = stories.map((s) => s.id);
  const missing = EXPECTED.filter((id) => !ids.includes(id));
  assert.deepEqual(missing, [], `Story slides no longer built: ${missing.join(', ')}. A data change probably stopped a reviewed reading from matching (see src/lib/data/stories.ts and reviewed-targets.ts).`);
  assert.deepEqual(ids, EXPECTED, 'Story order or set changed; update EXPECTED if intended.');
});

test('story slides contain no broken numbers or blank text', () => {
  for (const s of buildStories(todayIsoDate())) {
    const text = [s.kicker, s.headline, s.body, JSON.stringify(s.visual)].join(' ');
    assert.doesNotMatch(text, /undefined|NaN|null|Infinity/, `${s.id} has a missing value: ${text.slice(0, 200)}`);
    assert.ok(s.headline.trim() && s.body.trim(), `${s.id} has empty text`);
    if (s.visual.type === 'ladder') assert.ok(s.visual.rows.length > 1, `${s.id} ladder is empty`);
    if (s.visual.type === 'window') assert.ok(s.visual.marks.length > 0, `${s.id} has no deliveries`);
    if (s.visual.type === 'bars') assert.ok(s.visual.rows.every((r) => r.value >= 0 && r.value <= s.visual.max + 0.5), `${s.id} bar out of range`);
  }
});

test('Home target-movement text uses the same deduplicated count as Timeline', () => {
  const today = todayIsoDate();
  const underground = buildDelayStory('pink', lines.pink.milestones, today).sections.find((s) => s.id === 'underground');
  const slide = buildStories(today).find((s) => s.id === 'pink-deadlines');
  assert.ok(slide.body.includes(`has moved ${underground.changes} times`));
  assert.equal(slide.visual.rows.find((r) => r.tone === 'current').note, `moved ${underground.changes}×`);
});
