import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModule } from './helpers/load-module.mjs';

const load = (file) => loadModule(new URL(file, import.meta.url));
const { reviewedLineStories } = await import(load('../src/lib/data/reviewed-targets.ts'));
const { countTargetChanges, buildDelayStory } = await import(load('../src/lib/data/delay-story.ts'));
const target = (date, extra = {}) => ({ section: 'underground', kind: 'month', target: date, ...extra });

test('seven reports in the illustrative sequence contain four changes', () => {
  const dates = ['2026-12-31', '2026-09-30', '2026-09-30', '2026-12-31', '2026-12-31', '2027-03-31', '2027-05-31'];
  assert.equal(countTargetChanges(dates.map((date) => target(date))), 4);
  assert.equal(countTargetChanges([]), 0);
  assert.equal(countTargetChanges([target('2026-12-31')]), 0);
  // Returning to an earlier date counts again; this is not a distinct-date count.
  assert.equal(countTargetChanges(dates.slice(0, 4).map((date) => target(date))), 2);
});

test('equivalent reviewed upper limits reaffirm despite different wording or kinds', () => {
  assert.equal(countTargetChanges([
    target('2026-09-30', { label: 'September 2026' }),
    target('2026-09-30', { kind: 'by', label: 'End-September 2026' }),
    target('2026-09-30', { kind: 'month', label: 'Ministry confirms September' })
  ]), 0);
});

test('interleaved sections, milestone scopes and promise bases retain separate baselines', () => {
  const sequence = [
    target('2026-09-30'),
    target('2026-06-30', { section: 'elevated' }),
    target('2026-05-31', { changeSeries: 'civil-completion' }),
    target('2026-11-13', { measuredBy: 'inauguration' }),
    target('2026-08-31', { kind: 'not-before' }),
    target('2026-07-31', { kind: 'option' }),
    target('2026-09-30'),
    target('2026-09-30', { section: 'elevated' }),
    target('2026-06-30', { changeSeries: 'civil-completion' }),
    target('2026-11-14', { measuredBy: 'inauguration' }),
    target('2026-09-30')
  ];
  assert.equal(countTargetChanges(sequence), 3);
});

test('section summaries count changes without dropping reports or modifying other scoring', () => {
  const dates = ['2026-12-31', '2026-09-30', '2026-09-30', '2026-12-31', '2026-12-31', '2027-03-31', '2027-05-31'];
  const reports = dates.map((date, i) => ({
    id: `report-${i}`, date: `2025-01-${String(i + 1).padStart(2, '0')}`, revised_target: date
  }));
  reviewedLineStories.changeTest = {
    openingMilestoneId: 'opening',
    sections: [{ id: 'underground', label: 'Underground', openingMilestoneId: null }],
    targets: reports.map((m) => ({ ...target(m.revised_target), milestoneId: m.id, field: 'revised_target', matches: m.revised_target, label: m.revised_target })),
    spans: []
  };
  try {
    const source = JSON.stringify(reports);
    const section = buildDelayStory('changeTest', reports, '2026-11-22').sections[0];
    assert.equal(section.changes, 4);
    assert.equal(section.targets.length, 7);
    assert.deepEqual(section.targets.map((t) => t.milestoneId), reports.map((m) => m.id));
    assert.equal(section.missed, 2);
    assert.equal(section.current.target, '2027-05-31');
    assert.equal(JSON.stringify(reports), source);
    // Edited prose invalidates its reviewed reading for this statistic too.
    reports[5].revised_target = 'unreviewed wording';
    assert.equal(buildDelayStory('changeTest', reports, '2026-11-22').sections[0].changes, 3);
  } finally {
    delete reviewedLineStories.changeTest;
  }
});

test('Pink summary follows selected readings without assuming the illustrative result', () => {
  const { pink } = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8')).lines;
  const before = JSON.stringify(pink.milestones);
  const story = buildDelayStory('pink', pink.milestones, '2026-11-22');
  for (const section of story.sections) {
    const selected = reviewedLineStories.pink.targets.filter((r) => r.section === section.id && pink.milestones.some((m) => m.id === r.milestoneId && m[r.field] === r.matches));
    assert.equal(section.changes, countTargetChanges(selected));
    assert.equal(section.targets.length, selected.length);
  }
  assert.equal(JSON.stringify(pink.milestones), before);
});

test('Pink passenger-opening changes use evidence order and exclude completion targets', () => {
  const { pink } = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8')).lines;
  const [elevated, underground] = buildDelayStory('pink', pink.milestones, '2026-11-22').sections;
  assert.equal(elevated.earliest.label, 'Sep 2025');
  assert.deepEqual(underground.targets.map((t) => t.target), [
    '2026-06-30', '2026-12-31', '2026-09-30', '2026-12-31', '2027-03-31', '2027-05-31'
  ]);
  assert.equal(underground.changes, 5);
  assert.equal(underground.missed, 2);
  assert.equal(underground.current.label, 'May 2027');
  assert.ok(underground.targets.every((t, i, all) => i === 0 || all[i - 1].announced <= t.announced));
  assert.equal(underground.targets.some((t) => t.milestoneId === 'september-and-mid2027-forecast'), false);
  assert.ok(pink.milestones.some((m) => m.id === 'september-and-mid2027-forecast' && /completion/.test(m.scope)));
  for (const id of ['ministry-phased-schedule', 'aiib-december2025-monitoring', 'may2027-underground-target-reaffirmed']) {
    assert.ok(pink.milestones.some((m) => m.id === id), `${id} report was lost`);
  }
});

test('Pink count responds to evidence changes rather than a fixed result', () => {
  const { pink } = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8')).lines;
  const mapping = reviewedLineStories.pink.targets;
  const length = mapping.length;
  const section = (milestones) => buildDelayStory('pink', milestones, '2026-11-22').sections.find((s) => s.id === 'underground');
  const baseline = section(pink.milestones).changes;
  try {
    mapping.push({ ...target('2027-05-31'), milestoneId: 'may2027-underground-target-reaffirmed', field: 'revised_target', matches: 'May 2027', label: 'May 2027' });
    assert.equal(section(pink.milestones).changes, baseline);
    assert.equal(section(pink.milestones).current.outcome, 'pending');
    const revised = { id: 'test-later-opening', date: '2026-11-21', revised_target: 'June 2027 underground opening' };
    mapping.push({ ...target('2027-06-30'), milestoneId: revised.id, field: 'revised_target', matches: revised.revised_target, label: 'Jun 2027' });
    assert.equal(section([...pink.milestones, revised]).changes, baseline + 1);
    assert.equal(section([...pink.milestones, revised]).current.label, 'Jun 2027');
  } finally {
    mapping.splice(length);
  }
});
